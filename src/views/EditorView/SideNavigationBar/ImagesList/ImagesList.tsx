import React from 'react';
import { connect } from "react-redux";
import { LabelType } from "../../../../data/enums/LabelType";
import { ISize } from "../../../../interfaces/ISize";
import { AppState } from "../../../../store";
import { ImageData, LabelPoint, LabelRect } from "../../../../store/labels/types";
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
}

interface IState {
    size: ISize;
    searchQuery: string;
    sortOrder: 'none' | 'asc' | 'desc';
}

class ImagesList extends React.Component<IProps, IState> {
    private imagesListRef: HTMLDivElement;

    constructor(props) {
        super(props);

        this.state = {
            size: null,
            searchQuery: '',
            sortOrder: 'none'
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

        switch (this.props.activeLabelType) {
            case LabelType.LINE:
                return imageData.labelLines.length > 0
            case LabelType.IMAGE_RECOGNITION:
                return imageData.labelNameIds.length > 0
            case LabelType.POINT:
                return imageData.labelPoints
                    .filter((labelPoint: LabelPoint) => labelPoint.status === LabelStatus.ACCEPTED)
                    .length > 0
            case LabelType.POLYGON:
                return imageData.labelPolygons.length > 0
            case LabelType.RECT:
                return imageData.labelRects
                    .filter((labelRect: LabelRect) => labelRect.status === LabelStatus.ACCEPTED)
                    .length > 0
        }
    };

    private onClickHandler = (index: number) => {
        ImageActions.getImageByIndex(index)
    };

    private onSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ searchQuery: event.target.value }, this.updateListSize);
    };

    private toggleSort = () => {
        const { sortOrder } = this.state;
        let nextSortOrder: 'none' | 'asc' | 'desc' = 'none';
        if (sortOrder === 'none') nextSortOrder = 'desc';
        else if (sortOrder === 'desc') nextSortOrder = 'asc';
        else nextSortOrder = 'none';
        this.setState({ sortOrder: nextSortOrder }, this.updateListSize);
    };

    private getLabelCount = (imageData: ImageData): number => {
        return imageData.labelRects.length +
            imageData.labelPoints.length +
            imageData.labelLines.length +
            imageData.labelPolygons.length +
            imageData.labelNameIds.length;
    };

    private getProcessedImagesData = () => {
        const { imagesData } = this.props;
        const { searchQuery, sortOrder } = this.state;

        let processed = imagesData.map((data, index) => ({ data, index }));

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            processed = processed.filter(item =>
                item.data.fileData.name.toLowerCase().includes(query)
            );
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
        const { size, searchQuery, sortOrder } = this.state;
        const processedImages = this.getProcessedImagesData();

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
                    <div className="SortControl" onClick={this.toggleSort}>
                        <span>Sort by labels: </span>
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
    activeLabelType: state.labels.activeLabelType
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ImagesList);
