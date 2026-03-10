import React from 'react';
import { connect } from "react-redux";
import { LabelType } from "../../../../data/enums/LabelType";
import { ISize } from "../../../../interfaces/ISize";
import { AppState } from "../../../../store";
import { ImageData, LabelPoint, LabelRect, LabelName } from "../../../../store/labels/types";
import { VirtualList } from "../../../Common/VirtualList/VirtualList";
import ImagePreview from "../ImagePreview/ImagePreview";
import TextInput from "../../../Common/TextInput/TextInput";
import './ImagesList.scss';
import { ContextManager } from "../../../../logic/context/ContextManager";
import { ContextType } from "../../../../data/enums/ContextType";
import { ImageActions } from "../../../../logic/actions/ImageActions";
import { EventType } from "../../../../data/enums/EventType";
import { LabelStatus } from "../../../../data/enums/LabelStatus";

import { updateImagesListFilters, updateActiveImageIndex } from "../../../../store/labels/actionCreators";
import { LabelsSelector } from "../../../../store/selectors/LabelsSelector";

interface IProps {
    activeImageIndex: number;
    imagesData: ImageData[];
    activeLabelType: LabelType;
    labels: LabelName[];
    imageSearchQuery: string;
    labelSearchQuery: string;
    imageSortOrder: 'none' | 'asc' | 'desc';
    selectedLabelIds: string[];
    reverseCheckmarkLogic: boolean;
    updateImagesListFilters: (payload: any) => any;
    updateActiveImageIndex: (index: number) => any;
}

interface IState {
    size: ISize;
}

class ImagesList extends React.Component<IProps, IState> {
    private imagesListRef: HTMLDivElement;

    constructor(props: IProps) {
        super(props);

        this.state = {
            size: null,
        }
    }

    public componentDidMount(): void {
        this.updateListSize();
        window.addEventListener(EventType.RESIZE, this.updateListSize);
    }

    public componentWillUnmount(): void {
        window.removeEventListener(EventType.RESIZE, this.updateListSize);
    }

    private updateListSize = () => {
        if (!this.imagesListRef)
            return;

        const listBoundingBox = this.imagesListRef.getBoundingClientRect();
        this.setState({
            size: {
                width: listBoundingBox.width,
                height: listBoundingBox.height
            }
        })
    };

    private isImageChecked = (index: number): boolean => {
        const imageData = this.props.imagesData[index]
        if (!imageData) return false;

        let hasLabel = false;
        switch (this.props.activeLabelType) {
            case LabelType.LINE:
                hasLabel = imageData.labelLines.length > 0; break;
            case LabelType.IMAGE_RECOGNITION:
                hasLabel = imageData.labelNameIds.length > 0; break;
            case LabelType.POINT:
                hasLabel = imageData.labelPoints
                    .filter((labelPoint: LabelPoint) => labelPoint.status === LabelStatus.ACCEPTED)
                    .length > 0; break;
            case LabelType.POLYGON:
                hasLabel = imageData.labelPolygons.length > 0; break;
            case LabelType.RECT:
                hasLabel = imageData.labelRects
                    .filter((labelRect: LabelRect) => labelRect.status === LabelStatus.ACCEPTED)
                    .length > 0; break;
        }

        return this.props.reverseCheckmarkLogic ? !hasLabel : hasLabel;
    };

    private onClickHandler = (index: number) => {
        ImageActions.getImageByIndex(index)
    };

    private onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.updateImagesListFilters({ imageSearchQuery: event.target.value });
    };

    private onLabelSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.props.updateImagesListFilters({ labelSearchQuery: event.target.value });
    };

    private toggleCheckmarkLogic = () => {
        this.props.updateImagesListFilters({ reverseCheckmarkLogic: !this.props.reverseCheckmarkLogic });
    };

    private toggleSort = () => {
        const { imageSortOrder } = this.props;
        let nextSortOrder: 'none' | 'asc' | 'desc' = 'none';
        if (imageSortOrder === 'none') nextSortOrder = 'desc';
        else if (imageSortOrder === 'desc') nextSortOrder = 'asc';
        else nextSortOrder = 'none';
        this.props.updateImagesListFilters({ imageSortOrder: nextSortOrder });
    };

    private handleLabelToggle = (labelId: string) => {
        const { selectedLabelIds } = this.props;
        const nextSelectedLabelIds = selectedLabelIds.includes(labelId)
            ? selectedLabelIds.filter(id => id !== labelId)
            : [...selectedLabelIds, labelId];
        this.props.updateImagesListFilters({ selectedLabelIds: nextSelectedLabelIds });
    };

    private renderImagePreview = (index: number, isScrolling: boolean, isVisible: boolean, style: React.CSSProperties, processedImages: { data: ImageData, index: number }[]) => {
        const item = processedImages[index];
        const { size } = this.state;
        if (!item || !size) return null;

        return <ImagePreview
            key={item.index}
            style={style}
            size={{ width: size.width, height: 160 }}
            isScrolling={isScrolling}
            isChecked={this.isImageChecked(item.index)}
            imageData={item.data}
            onClick={() => this.onClickHandler(item.index)}
            isSelected={this.props.activeImageIndex === item.index}
        />
    };

    public render() {
        const { labels, imageSearchQuery, labelSearchQuery, imageSortOrder, selectedLabelIds, reverseCheckmarkLogic } = this.props;
        const { size } = this.state;
        const processedImages = LabelsSelector.getProcessedImages();

        const filteredLabels = labels.filter((label, index) => {
            if (!labelSearchQuery) return true;
            const query = labelSearchQuery.toLowerCase();
            return label.name.toLowerCase().includes(query) || index.toString() === query;
        });

        return (
            <div
                className="ImagesList"
                onClick={() => ContextManager.switchCtx(ContextType.LEFT_NAVBAR)}
            >
                <div className="ImagesListHeader">
                    <TextInput
                        label="Search by name"
                        isPassword={false}
                        value={imageSearchQuery}
                        onChange={this.onSearchChange}
                        inputStyle={{ color: 'white' }}
                    />

                    <div className="LabelFilter">
                        <div className="LabelFilterHeader">
                            <div className="LabelFilterTitle">Filter by labels:</div>
                            <div
                                className={`ReverseLogicToggle ${reverseCheckmarkLogic ? 'active' : ''}`}
                                onClick={this.toggleCheckmarkLogic}
                                title="Reverse checkmark logic (Labeled vs Unlabeled)"
                            >
                                ⇄
                            </div>
                        </div>

                        <div className="LabelSearchWrapper">
                            <TextInput
                                label="Search labels (by name or index)"
                                isPassword={false}
                                value={labelSearchQuery}
                                onChange={this.onLabelSearchChange}
                                inputStyle={{ color: 'white', fontSize: '12px' }}
                            />
                        </div>

                        <div className="LabelList">
                            {filteredLabels.map(label => {
                                const index = labels.findIndex(l => l.id === label.id);
                                return (
                                    <div
                                        key={label.id}
                                        className={`LabelItem ${selectedLabelIds.includes(label.id) ? 'active' : ''}`}
                                        onClick={() => this.handleLabelToggle(label.id)}
                                    >
                                        <div className="Checkbox">
                                            {selectedLabelIds.includes(label.id) && <span className="CheckMark">✓</span>}
                                        </div>
                                        <span className="LabelName">
                                            <span className="LabelIndex">{index}</span> {label.name}
                                        </span>
                                        <div
                                            className="LabelColor"
                                            style={{ backgroundColor: label.color }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="SortControl" onClick={this.toggleSort}>
                        <span>Sort by count: </span>
                        <span className="SortIcon">
                            {imageSortOrder === 'none' ? '—' : (imageSortOrder === 'asc' ? '↑' : '↓')}
                        </span>
                    </div>
                </div>
                <div className="VirtualListWrapper" ref={ref => this.imagesListRef = ref}>
                    {!!size && <VirtualList
                        size={size}
                        childSize={{ width: size.width, height: 160 }}
                        childCount={processedImages.length}
                        childRender={(idx, isScrolling, isVisible, style) =>
                            this.renderImagePreview(idx, isScrolling, isVisible, style, processedImages)}
                        overScanHeight={200}
                    />}
                </div>
            </div>
        )
    }
}

const mapDispatchToProps = {
    updateImagesListFilters,
    updateActiveImageIndex
};

const mapStateToProps = (state: AppState) => ({
    activeImageIndex: state.labels.activeImageIndex,
    imagesData: state.labels.imagesData,
    activeLabelType: state.labels.activeLabelType,
    labels: state.labels.labels,
    imageSearchQuery: state.labels.imageSearchQuery,
    labelSearchQuery: state.labels.labelSearchQuery,
    imageSortOrder: state.labels.imageSortOrder,
    selectedLabelIds: state.labels.selectedLabelIds,
    reverseCheckmarkLogic: state.labels.reverseCheckmarkLogic
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ImagesList as any);
