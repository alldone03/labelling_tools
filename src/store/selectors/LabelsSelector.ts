import {store} from '../..';
import {ImageData, LabelLine, LabelName, LabelPoint, LabelPolygon, LabelRect} from '../labels/types';
import {find} from 'lodash';
import {LabelType} from '../../data/enums/LabelType';
import {LabelStatus} from '../../data/enums/LabelStatus';

export class LabelsSelector {
    public static getLabelNames(): LabelName[] {
        return store.getState().labels.labels;
    }

    public static getLabelNameById(id: string): LabelName | undefined {
        const labelName: LabelName[] = LabelsSelector.getLabelNames()
        return find(labelName, {id});
    }

    public static getActiveLabelNameId(): string {
        return store.getState().labels.activeLabelNameId;
    }

    public static getActiveLabelType(): LabelType {
        return store.getState().labels.activeLabelType;
    }

    public static getImagesData(): ImageData[] {
        return store.getState().labels.imagesData;
    }

    public static getActiveImageIndex(): number {
        return store.getState().labels.activeImageIndex;
    }

    public static getActiveImageData(): ImageData | null {
        const activeImageIndex: number | null = LabelsSelector.getActiveImageIndex();

        if (activeImageIndex === null)
            return null;

        return LabelsSelector.getImageDataByIndex(activeImageIndex);
    }

    public static getImageDataByIndex(index: number): ImageData {
        const imagesData: ImageData[] = LabelsSelector.getImagesData();
        return imagesData[index];
    }

    public static getImageDataById(id: string): ImageData {
        const imagesData: ImageData[] = LabelsSelector.getImagesData();
        return find(imagesData, {id});
    }

    public static getActiveLabelId(): string | null {
        return store.getState().labels.activeLabelId;
    }

    public static getHighlightedLabelId(): string | null {
        return store.getState().labels.highlightedLabelId;
    }

    public static getActiveRectLabel(): LabelRect | null {
        const activeLabelId: string | null = LabelsSelector.getActiveLabelId();

        if (activeLabelId === null)
            return null;

        return find(LabelsSelector.getActiveImageData().labelRects, {id: activeLabelId});
    }

    public static getActivePointLabel(): LabelPoint | null {
        const activeLabelId: string | null = LabelsSelector.getActiveLabelId();

        if (activeLabelId === null)
            return null;

        return find(LabelsSelector.getActiveImageData().labelPoints, {id: activeLabelId});
    }

    public static getActivePolygonLabel(): LabelPolygon | null {
        const activeLabelId: string | null = LabelsSelector.getActiveLabelId();

        if (activeLabelId === null)
            return null;

        return find(LabelsSelector.getActiveImageData().labelPolygons, {id: activeLabelId});
    }

    public static getActiveLineLabel(): LabelLine | null {
        const activeLabelId: string | null = LabelsSelector.getActiveLabelId();

        if (activeLabelId === null)
            return null;

        return find(LabelsSelector.getActiveImageData().labelLines, {id: activeLabelId});
    }

    private static getLabelCount(imageData: ImageData): number {
        return imageData.labelRects.length +
            imageData.labelPoints.length +
            imageData.labelLines.length +
            imageData.labelPolygons.length +
            imageData.labelNameIds.length;
    };

    public static getProcessedImages(): { data: ImageData, index: number }[] {
        const state = store.getState().labels;
        const imagesData = state.imagesData;
        const activeLabelType = state.activeLabelType;
        const { imageSearchQuery, labelSearchQuery, imageSortOrder, selectedLabelIds, reverseCheckmarkLogic } = state;

        let processed = imagesData.map((data, index) => ({ data, index }));

        if (imageSearchQuery) {
            const query = imageSearchQuery.toLowerCase();
            processed = processed.filter(item =>
                item.data.fileData.name.toLowerCase().includes(query)
            );
        }

        const getHasLabel = (data: ImageData, labelIds: string[]) => {
            return (
                data.labelRects.some(r => labelIds.includes(r.labelId) && r.status === LabelStatus.ACCEPTED) ||
                data.labelPoints.some(p => labelIds.includes(p.labelId) && p.status === LabelStatus.ACCEPTED) ||
                data.labelPolygons.some(p => labelIds.includes(p.labelId)) ||
                data.labelLines.some(l => labelIds.includes(l.labelId)) ||
                data.labelNameIds.some(id => labelIds.includes(id))
            );
        };

        const getHasAnyLabelOfType = (data: ImageData) => {
            switch (activeLabelType) {
                case LabelType.RECT: return data.labelRects.some(r => r.status === LabelStatus.ACCEPTED);
                case LabelType.POINT: return data.labelPoints.some(p => p.status === LabelStatus.ACCEPTED);
                case LabelType.POLYGON: return data.labelPolygons.length > 0;
                case LabelType.LINE: return data.labelLines.length > 0;
                case LabelType.IMAGE_RECOGNITION: return data.labelNameIds.length > 0;
                default: return false;
            }
        };

        if (reverseCheckmarkLogic) {
            if (selectedLabelIds.length === 0) {
                processed = processed.filter(item => !getHasAnyLabelOfType(item.data));
            } else {
                processed = processed.filter(item => !getHasLabel(item.data, selectedLabelIds));
            }
        } else {
            if (selectedLabelIds.length > 0) {
                processed = processed.filter(item => getHasLabel(item.data, selectedLabelIds));
            }
        }

        if (imageSortOrder !== 'none') {
            processed.sort((a, b) => {
                const countA = LabelsSelector.getLabelCount(a.data);
                const countB = LabelsSelector.getLabelCount(b.data);
                return imageSortOrder === 'asc' ? countA - countB : countB - countA;
            });
        }

        return processed;
    }
}
