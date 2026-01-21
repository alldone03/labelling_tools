import {LabelType} from '../../data/enums/LabelType';
import {LabelsSelector} from '../../store/selectors/LabelsSelector';
import {AISSDObjectDetectionActions} from './AISSDObjectDetectionActions';
import {AIPoseDetectionActions} from './AIPoseDetectionActions';
import {ImageData} from '../../store/labels/types';
import {AISelector} from '../../store/selectors/AISelector';
import { AIYOLOObjectDetectionActions } from './AIYOLOObjectDetectionActions';
import { AIRoboflowAPIObjectDetectionActions } from './AIRoboflowAPIObjectDetectionActions';
import { AIBackendObjectDetectionActions } from './AIBackendObjectDetectionActions';

export class AIActions {
    public static excludeRejectedLabelNames(suggestedLabels: string[], rejectedLabels: string[]): string[] {
        return suggestedLabels.reduce((acc: string[], label: string) => {
            if (!rejectedLabels.includes(label)) {
                acc.push(label)
            }
            return acc;
        }, [])
    }

    public static detect(imageId: string, image: HTMLImageElement): void {
        if (AISelector.isAIDisabled()) return;

        const imageData =  LabelsSelector.getImageDataById(imageId)
        const activeLabelType: LabelType = LabelsSelector.getActiveLabelType();
        const isAIYOLOObjectDetectorModelLoaded = AISelector.isAIYOLOObjectDetectorModelLoaded();
        const isAISSDObjectDetectorModelLoaded = AISelector.isAISSDObjectDetectorModelLoaded();
        const isAIBackendObjectDetectorLoaded = AISelector.isAIBackendObjectDetectorLoaded();
        const isRoboflowAPIModelLoaded = AISelector.isRoboflowAPIModelLoaded();
        switch (activeLabelType) {
            case LabelType.RECT:
                if (isAISSDObjectDetectorModelLoaded) {
                    AISSDObjectDetectionActions.detectRects(imageId, image);
                }
                if (isAIYOLOObjectDetectorModelLoaded) {
                    AIYOLOObjectDetectionActions.detectRects(imageId, image);
                }
                if (isAIBackendObjectDetectorLoaded) {
                    AIBackendObjectDetectionActions.detectRects(imageId, image);
                }
                if (isRoboflowAPIModelLoaded) {
                    AIRoboflowAPIObjectDetectionActions.detectRects(imageData)
                }
                break;
            case LabelType.POINT:
                AIPoseDetectionActions.detectPoses(imageId, image);
                break;
        }
    }

    public static rejectAllSuggestedLabels(imageData: ImageData) {
        const activeLabelType: LabelType = LabelsSelector.getActiveLabelType();
        const isAIYOLOObjectDetectorModelLoaded = AISelector.isAIYOLOObjectDetectorModelLoaded();
        const isAISSDObjectDetectorModelLoaded = AISelector.isAISSDObjectDetectorModelLoaded();
        const isAIBackendObjectDetectorLoaded = AISelector.isAIBackendObjectDetectorLoaded();
        const isRoboflowAPIModelLoaded = AISelector.isRoboflowAPIModelLoaded();
        switch (activeLabelType) {
            case LabelType.RECT:
                if (isAISSDObjectDetectorModelLoaded) {
                    AISSDObjectDetectionActions.rejectAllSuggestedRectLabels(imageData);
                }
                if (isAIYOLOObjectDetectorModelLoaded) {
                    AIYOLOObjectDetectionActions.rejectAllSuggestedRectLabels(imageData);
                }
                if (isAIBackendObjectDetectorLoaded) {
                    AIBackendObjectDetectionActions.rejectAllSuggestedRectLabels(imageData);
                }
                if (isRoboflowAPIModelLoaded) {
                    AIRoboflowAPIObjectDetectionActions.rejectAllSuggestedRectLabels(imageData)
                }
                break;
            case LabelType.POINT:
                AIPoseDetectionActions.rejectAllSuggestedPointLabels(imageData);
                break;
        }
    }

    public static acceptAllSuggestedLabels(imageData: ImageData) {
        const activeLabelType: LabelType = LabelsSelector.getActiveLabelType();
        const isAIYOLOObjectDetectorModelLoaded = AISelector.isAIYOLOObjectDetectorModelLoaded();
        const isAISSDObjectDetectorModelLoaded = AISelector.isAISSDObjectDetectorModelLoaded();
        const isAIBackendObjectDetectorLoaded = AISelector.isAIBackendObjectDetectorLoaded();
        const isRoboflowAPIModelLoaded = AISelector.isRoboflowAPIModelLoaded();
        switch (activeLabelType) {
            case LabelType.RECT:
                if (isAISSDObjectDetectorModelLoaded) {
                    AISSDObjectDetectionActions.acceptAllSuggestedRectLabels(imageData);
                }
                if (isAIYOLOObjectDetectorModelLoaded) {
                    AIYOLOObjectDetectionActions.acceptAllSuggestedRectLabels(imageData);
                }
                if (isAIBackendObjectDetectorLoaded) {
                    AIBackendObjectDetectionActions.acceptAllSuggestedRectLabels(imageData);
                }
                if (isRoboflowAPIModelLoaded) {
                    AIRoboflowAPIObjectDetectionActions.acceptAllSuggestedRectLabels(imageData)
                }
                break;
            case LabelType.POINT:
                AIPoseDetectionActions.acceptAllSuggestedPointLabels(imageData);
                break;
        }
    }
}
