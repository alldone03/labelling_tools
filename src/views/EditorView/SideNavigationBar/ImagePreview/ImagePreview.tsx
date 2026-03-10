import classNames from "classnames";
import React from 'react';
import { connect } from "react-redux";
import { ClipLoader } from "react-spinners";
import { ImageLoadManager } from "../../../../logic/imageRepository/ImageLoadManager";
import { IRect } from "../../../../interfaces/IRect";
import { ISize } from "../../../../interfaces/ISize";
import { ImageRepository } from "../../../../logic/imageRepository/ImageRepository";
import { AppState } from "../../../../store";
import { updateImageDataById } from "../../../../store/labels/actionCreators";
import { ImageData } from "../../../../store/labels/types";
import { FileUtil } from "../../../../utils/FileUtil";
import { RectUtil } from "../../../../utils/RectUtil";
import './ImagePreview.scss';
import { CSSHelper } from "../../../../logic/helpers/CSSHelper";

interface IProps {
    imageData: ImageData;
    style: React.CSSProperties;
    size: ISize;
    isScrolling?: boolean;
    isChecked?: boolean;
    onClick?: () => any;
    isSelected?: boolean;
    updateImageDataById: (id: string, newImageData: ImageData) => any;
}

interface IState {
    image: HTMLImageElement;
}

class ImagePreview extends React.Component<IProps, IState> {
    private isLoading: boolean = false;

    constructor(props: IProps) {
        super(props);

        this.state = {
            image: null,
        }
    }

    public componentDidMount(): void {
        ImageLoadManager.addAndRun(this.loadImage(this.props.imageData, this.props.isScrolling));
    }

    public componentWillUpdate(nextProps: Readonly<IProps>): void {
        if (this.props.imageData.id !== nextProps.imageData.id) {
            if (nextProps.imageData.loadStatus) {
                ImageLoadManager.addAndRun(this.loadImage(nextProps.imageData, nextProps.isScrolling));
            }
            else {
                this.setState({ image: null });
            }
        }

        if (this.props.isScrolling && !nextProps.isScrolling) {
            ImageLoadManager.addAndRun(this.loadImage(nextProps.imageData, false));
        }
    }

    shouldComponentUpdate(nextProps: Readonly<IProps>, nextState: Readonly<IState>): boolean {
        return (
            this.props.imageData.id !== nextProps.imageData.id ||
            this.state.image !== nextState.image ||
            this.props.isSelected !== nextProps.isSelected ||
            this.props.isChecked !== nextProps.isChecked ||
            this.props.size.width !== nextProps.size.width
        )
    }

    private loadImage = async (imageData: ImageData, isScrolling: boolean) => {
        if (imageData.loadStatus) {
            const image = ImageRepository.getById(imageData.id);
            if (this.state.image !== image) {
                this.setState({ image });
            }
        }
        else if (!isScrolling || !this.isLoading) {
            this.isLoading = true;
            const saveLoadedImagePartial = (image: HTMLImageElement) => this.saveLoadedImage(image, imageData);
            FileUtil.loadImage(imageData.fileData)
                .then((image: HTMLImageElement) => saveLoadedImagePartial(image))
                .catch((error) => this.handleLoadImageError())
        }
    };

    private saveLoadedImage = (image: HTMLImageElement, imageData: ImageData) => {
        imageData.loadStatus = true;
        this.props.updateImageDataById(imageData.id, imageData);
        ImageRepository.storeImage(imageData.id, image);
        if (imageData.id === this.props.imageData.id) {
            this.setState({ image });
            this.isLoading = false;
        }
    };

    private getStyle = () => {
        const { size } = this.props;

        const containerRect: IRect = {
            x: 0.05 * size.height,
            y: 0.05 * size.height,
            width: 0.9 * size.height,
            height: 0.9 * size.height
        };

        const imageRect: IRect = {
            x: 0,
            y: 0,
            width: this.state.image.width,
            height: this.state.image.height
        };

        const imageRatio = RectUtil.getRatio(imageRect);
        const imagePosition: IRect = RectUtil.fitInsideRectWithRatio(containerRect, imageRatio);

        return {
            width: imagePosition.width,
            height: imagePosition.height,
            left: imagePosition.x,
            top: imagePosition.y
        }
    };

    private handleLoadImageError = () => { };

    private getClassName = () => {
        return classNames(
            "ImagePreview",
            {
                "selected": this.props.isSelected,
            }
        );
    };

    public render() {
        const {
            isChecked,
            style,
            onClick,
            imageData,
            size
        } = this.props;

        const isListMode = size.width > 200;

        return (
            <div
                className={classNames(this.getClassName(), { "list-mode": isListMode })}
                style={style}
                onClick={onClick ? onClick : undefined}
            >
                <div className="PreviewContent">
                    {(!!this.state.image) ?
                        <div className="ImageWrapper">
                            <div
                                className="Foreground"
                                style={this.getStyle()}
                            >
                                <img
                                    className="Image"
                                    draggable={false}
                                    src={this.state.image.src}
                                    alt={this.state.image.alt}
                                    style={{ ...this.getStyle(), left: 0, top: 0 }}
                                />
                                {isChecked && <img
                                    className="CheckBox"
                                    draggable={false}
                                    src={"ico/ok.png"}
                                    alt={"checkbox"}
                                />}
                            </div>
                            <div
                                className="Background"
                                style={this.getStyle()}
                            />
                        </div> :
                        <div className="LoaderWrapper">
                            <ClipLoader
                                size={30}
                                color={CSSHelper.getLeadingColor()}
                                loading={true}
                            />
                        </div>
                    }
                    {isListMode && (
                        <div className="ImageInfo">
                            <div className="ImageName">{imageData.fileData.name}</div>
                            <div className="ImageDetails">
                                {imageData.labelRects.length + imageData.labelPoints.length} labels
                            </div>
                        </div>
                    )}
                </div>
            </div>)
    }
}

const mapDispatchToProps = {
    updateImageDataById
};

const mapStateToProps = (state: AppState) => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(ImagePreview as any);