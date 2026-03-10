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

interface IProps {
    activeImageIndex: number;
    imagesData: ImageData[];
    activeLabelType: LabelType;
    labels: LabelName[];
}

interface IState {
    size: ISize;
    searchQuery: string;
    labelSearchQuery: string;
    sortOrder: 'none' | 'asc' | 'desc';
    selectedLabelIds: string[];
    reverseCheckmarkLogic: boolean;
}

class ImagesList extends React.Component<IProps, IState> {
    private imagesListRef: HTMLDivElement;

    constructor(props) {
        super(props);

        this.state = {
            size: null,
            searchQuery: '',
            labelSearchQuery: '',
            sortOrder: 'none',
            selectedLabelIds: [],
            reverseCheckmarkLogic: false
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

        return this.state.reverseCheckmarkLogic ? !hasLabel : hasLabel;
    };

    private onClickHandler = (index: number) => {
        ImageActions.getImageByIndex(index)
    };

    private onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ searchQuery: event.target.value }, this.updateListSize);
    };

    private onLabelSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ labelSearchQuery: event.target.value }, this.updateListSize);
    };

    private toggleCheckmarkLogic = () => {
        this.setState({ reverseCheckmarkLogic: !this.state.reverseCheckmarkLogic });
    };

    private toggleSort = () => {
        const { sortOrder } = this.state;
        let nextSortOrder: 'none' | 'asc' | 'desc' = 'none';
        if (sortOrder === 'none') nextSortOrder = 'desc';
        else if (sortOrder === 'desc') nextSortOrder = 'asc';
        else nextSortOrder = 'none';
        this.setState({ sortOrder: nextSortOrder }, this.updateListSize);
    };

    private handleLabelToggle = (labelId: string) => {
        const { selectedLabelIds } = this.state;
        const nextSelectedLabelIds = selectedLabelIds.includes(labelId)
            ? selectedLabelIds.filter(id => id !== labelId)
            : [...selectedLabelIds, labelId];
        this.setState({ selectedLabelIds: nextSelectedLabelIds }, this.updateListSize);
    };

    private getLabelCount = (imageData: ImageData): number => {
        return imageData.labelRects.length +
            imageData.labelPoints.length +
            imageData.labelLines.length +
            imageData.labelPolygons.length +
            imageData.labelNameIds.length;
    };

    private getProcessedImagesData = () => {
        const { imagesData, activeLabelType } = this.props;
        const { searchQuery, sortOrder, selectedLabelIds, reverseCheckmarkLogic } = this.state;

        let processed = imagesData.map((data, index) => ({ data, index }));

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
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
                // Show ONLY images that don't have any labels of the active type
                processed = processed.filter(item => !getHasAnyLabelOfType(item.data));
            } else {
                // Show ONLY images that DON'T have any of the selected labels
                processed = processed.filter(item => !getHasLabel(item.data, selectedLabelIds));
            }
        } else {
            if (selectedLabelIds.length > 0) {
                // Show ONLY images that HAVE any of the selected labels
                processed = processed.filter(item => getHasLabel(item.data, selectedLabelIds));
            }
        }

        if (sortOrder !== 'none') {
            processed.sort((a, b) => {
                const countA = this.getLabelCount(a.data);
                const countB = this.getLabelCount(b.data);
                return sortOrder === 'asc' ? countA - countB : countB - countA;
            });
        }

        return processed;
    };

    private renderImagePreview = (index: number, isScrolling: boolean, isVisible: boolean, style: React.CSSProperties, processedImages: { data: ImageData, index: number }[]) => {
        const item = processedImages[index];
        if (!item) return null;

        return <ImagePreview
            key={item.index}
            style={style}
            size={{ width: 150, height: 150 }}
            isScrolling={isScrolling}
            isChecked={this.isImageChecked(item.index)}
            imageData={item.data}
            onClick={() => this.onClickHandler(item.index)}
            isSelected={this.props.activeImageIndex === item.index}
        />
    };

    public render() {
        const { labels } = this.props;
        const { size, searchQuery, labelSearchQuery, sortOrder, selectedLabelIds, reverseCheckmarkLogic } = this.state;
        const processedImages = this.getProcessedImagesData();

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
                        value={searchQuery}
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
                            {sortOrder === 'none' ? '—' : (sortOrder === 'asc' ? '↑' : '↓')}
                        </span>
                    </div>
                </div>
                <div className="VirtualListWrapper" ref={ref => this.imagesListRef = ref}>
                    {!!size && <VirtualList
                        size={size}
                        childSize={{ width: 150, height: 150 }}
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

const mapDispatchToProps = {};

const mapStateToProps = (state: AppState) => ({
    activeImageIndex: state.labels.activeImageIndex,
    imagesData: state.labels.imagesData,
    activeLabelType: state.labels.activeLabelType,
    labels: state.labels.labels
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ImagesList);
