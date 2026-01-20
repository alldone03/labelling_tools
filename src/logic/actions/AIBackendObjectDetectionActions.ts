import {DetectedObject} from '@tensorflow-models/coco-ssd';
import {ImageData, LabelName, LabelRect} from '../../store/labels/types';
import {LabelsSelector} from '../../store/selectors/LabelsSelector';
import { v4 as uuidv4 } from 'uuid';
import {store} from '../../index';
import {updateImageDataById} from '../../store/labels/actionCreators';
import {ImageRepository} from '../imageRepository/ImageRepository';
import {LabelStatus} from '../../data/enums/LabelStatus';
import {findLast} from 'lodash';
import {updateSuggestedLabelList} from '../../store/ai/actionCreators';
import {PopupWindowType} from '../../data/enums/PopupWindowType';
import {updateActivePopupType} from '../../store/general/actionCreators';
import {AIActions} from './AIActions';
import {updateLabelNames} from '../../store/labels/actionCreators';
import {ArrayUtil} from '../../utils/ArrayUtil';
import {Settings} from '../../settings/Settings';
import {backendService, Annotation} from '../../services/backendService';

export class AIBackendObjectDetectionActions {
    public static detectRectsForActiveImage(): void {
        const activeImageData: ImageData = LabelsSelector.getActiveImageData();
        AIBackendObjectDetectionActions.detectRects(activeImageData.id, ImageRepository.getById(activeImageData.id))
    }

    public static async detectRects(imageId: string, image: HTMLImageElement): Promise<void> {
        if (LabelsSelector.getImageDataById(imageId).isVisitedByObjectDetector)
            return;

        store.dispatch(updateActivePopupType(PopupWindowType.LOADER));
        
        try {
            // Convert HTMLImageElement to File
            const blob = await AIBackendObjectDetectionActions.imageToBlob(image);
            const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
            
            // Call backend API
            const response = await backendService.annotateImage(file);
            
            if (response.success && response.annotations.length > 0) {
                const predictions = AIBackendObjectDetectionActions.convertAnnotationsToDetectedObjects(response.annotations);
                
                // AUTO-ADD NEW LABELS
                const suggestedLabelNames = AIBackendObjectDetectionActions
                    .extractNewSuggestedLabelNames(LabelsSelector.getLabelNames(), predictions);
                
                const newlySuggestedNames = AIActions.excludeRejectedLabelNames(
                    suggestedLabelNames, 
                    []
                );
                
                if (newlySuggestedNames.length > 0) {
                     // Automatically add new label names to the project
                     const currentLabelNames = LabelsSelector.getLabelNames();
                     const newLabels = newlySuggestedNames.reduce((acc: LabelName[], name: string, index: number) => {
                         acc.push({
                             name: name,
                             id: uuidv4(),
                             color: ArrayUtil.getByInfiniteIndex(Settings.LABEL_COLORS_PALETTE, currentLabelNames.length + index)
                         });
                         return acc;
                     }, [...currentLabelNames]);
                     store.dispatch(updateLabelNames(newLabels));
                }
                
                store.dispatch(updateActivePopupType(null));
                
                // Pass the UPDATED label names to ensure we can find the IDs
                AIBackendObjectDetectionActions.saveRectPredictions(imageId, predictions, LabelsSelector.getLabelNames());
            } else {
                store.dispatch(updateActivePopupType(null));
                console.error('Backend annotation failed:', response.error);
            }
        } catch (error) {
            store.dispatch(updateActivePopupType(null));
            console.error('Error during backend detection:', error);
        }
    }

    private static async imageToBlob(image: HTMLImageElement): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }
            
            ctx.drawImage(image, 0, 0);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Could not convert image to blob'));
                }
            }, 'image/jpeg', 0.95);
        });
    }

    private static convertAnnotationsToDetectedObjects(annotations: Annotation[]): DetectedObject[] {
        return annotations.map(ann => ({
            bbox: [
                ann.bbox[0] - ann.bbox[2] / 2, // Convert from center x to top-left x
                ann.bbox[1] - ann.bbox[3] / 2, // Convert from center y to top-left y
                ann.bbox[2], // width
                ann.bbox[3]  // height
            ],
            class: ann.class,
            score: ann.score
        }));
    }

    public static saveRectPredictions(imageId: string, predictions: DetectedObject[], labelNames?: LabelName[]) {
        const imageData: ImageData = LabelsSelector.getImageDataById(imageId);
        const labelsToUse = labelNames || LabelsSelector.getLabelNames();
        const predictedLabels: LabelRect[] = AIBackendObjectDetectionActions.mapPredictionsToRectLabels(predictions, labelsToUse);
        const nextImageData: ImageData = {
            ...imageData,
            labelRects: imageData.labelRects.concat(predictedLabels),
            isVisitedByObjectDetector: true
        };
        store.dispatch(updateImageDataById(imageData.id, nextImageData));
    }

    private static mapPredictionsToRectLabels(predictions: DetectedObject[], labelNames: LabelName[]): LabelRect[] {
        return predictions.map((prediction: DetectedObject) => {
            const label = labelNames.find(l => l.name === prediction.class);
            return {
                id: uuidv4(),
                labelIndex: null, // Deprecated or unused in favor of ID?
                labelId: label ? label.id : null,
                rect: {
                    x: prediction.bbox[0],
                    y: prediction.bbox[1],
                    width: prediction.bbox[2],
                    height: prediction.bbox[3],
                },
                isVisible: true,
                isCreatedByAI: true,
                status: LabelStatus.ACCEPTED,
                suggestedLabel: prediction.class
            }
        })
    }

    public static extractNewSuggestedLabelNames(labels: LabelName[], predictions: DetectedObject[]): string[] {
        return predictions.reduce((acc: string[], prediction: DetectedObject) => {
            if (!acc.includes(prediction.class) && !findLast(labels, {name: prediction.class})) {
                acc.push(prediction.class)
            }
            return acc;
        }, [])
    }

    public static acceptAllSuggestedRectLabels(imageData: ImageData) {
        const newImageData: ImageData = {
            ...imageData,
            labelRects: imageData.labelRects.map((labelRect: LabelRect) => {
                const labelName: LabelName = findLast(LabelsSelector.getLabelNames(), {name: labelRect.suggestedLabel});
                return {
                    ...labelRect,
                    status: LabelStatus.ACCEPTED,
                    labelId: !!labelName ? labelName.id : labelRect.labelId
                }
            })
        };
        store.dispatch(updateImageDataById(newImageData.id, newImageData));
    }

    public static rejectAllSuggestedRectLabels(imageData: ImageData) {
        const newImageData: ImageData = {
            ...imageData,
            labelRects: imageData.labelRects.filter((labelRect: LabelRect) => labelRect.status === LabelStatus.ACCEPTED)
        };
        store.dispatch(updateImageDataById(newImageData.id, newImageData));
    }
}
