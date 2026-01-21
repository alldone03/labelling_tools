import React from 'react';
import { ISize } from '../../../../interfaces/ISize';
import './LabelInputField.scss';
import classNames from 'classnames';
import { ImageButton } from '../../../Common/ImageButton/ImageButton';
import { IRect } from '../../../../interfaces/IRect';
import { IPoint } from '../../../../interfaces/IPoint';
import { RectUtil } from '../../../../utils/RectUtil';
import { AppState } from '../../../../store';
import { connect } from 'react-redux';
import { updateActiveLabelId, updateHighlightedLabelId } from '../../../../store/labels/actionCreators';
import Scrollbars from 'react-custom-scrollbars-2';
import { EventType } from '../../../../data/enums/EventType';
import { LabelName } from '../../../../store/labels/types';
import { LabelsSelector } from '../../../../store/selectors/LabelsSelector';
import { PopupWindowType } from '../../../../data/enums/PopupWindowType';
import { updateActivePopupType } from '../../../../store/general/actionCreators';
import { truncate } from 'lodash';
import { Settings } from '../../../../settings/Settings';

interface IProps {
    size: ISize;
    isActive: boolean;
    isHighlighted: boolean;
    isVisible?: boolean;
    id: string;
    value?: LabelName;
    options: LabelName[];
    onDelete: (id: string) => any;
    onSelectLabel: (labelRectId: string, labelNameId: string) => any;
    updateHighlightedLabelId: (highlightedLabelId: string) => any;
    updateActiveLabelId: (highlightedLabelId: string) => any;
    updateActivePopupType: (activePopupType: PopupWindowType) => any;
    toggleLabelVisibility?: (labelNameId: string) => any;
}

interface IState {
    animate: boolean;
    isOpen: boolean;
    filterQuery: string;
    selectedIndex: number;
}

class LabelInputField extends React.Component<IProps, IState> {
    private dropdownOptionHeight: number = 30;
    private dropdownOptionCount: number = 6;
    private dropdownMargin: number = 4;
    private dropdownLabel: HTMLDivElement;
    private dropdown: HTMLDivElement;

    public constructor(props) {
        super(props);
        this.state = {
            animate: false,
            isOpen: false,
            filterQuery: '',
            selectedIndex: 0
        }
    }

    public componentDidMount(): void {
        requestAnimationFrame(() => {
            this.setState({ animate: true });
        });
    }

    private getClassName() {
        return classNames(
            'LabelInputField',
            {
                'loaded': this.state.animate,
                'active': this.props.isActive,
                'highlighted': this.props.isHighlighted
            }
        );
    }

    private openDropdown = () => {
        if (LabelsSelector.getLabelNames().length === 0) {
            this.props.updateActivePopupType(PopupWindowType.UPDATE_LABEL);
        } else {
            this.setState({
                isOpen: true,
                filterQuery: '',
                selectedIndex: 0
            });
            window.addEventListener(EventType.MOUSE_DOWN, this.closeDropdown);
        }
    };

    private closeDropdown = (event: MouseEvent) => {
        const mousePosition: IPoint = { x: event.clientX, y: event.clientY };
        const clientRect = this.dropdown.getBoundingClientRect();
        const dropDownRect: IRect = {
            x: clientRect.left,
            y: clientRect.top,
            width: clientRect.width,
            height: clientRect.height
        };

        if (!RectUtil.isPointInside(dropDownRect, mousePosition)) {
            this.setState({ isOpen: false });
            window.removeEventListener(EventType.MOUSE_DOWN, this.closeDropdown)
        }
    };

    private getDropdownStyle = (): React.CSSProperties => {
        const clientRect = this.dropdownLabel.getBoundingClientRect();
        const filteredOptionsCount = this.getFilteredOptions().length;
        // Search input height (30px) + options height
        const height: number = (Math.min(filteredOptionsCount, this.dropdownOptionCount) * this.dropdownOptionHeight) + 34; // + search input
        const style = {
            width: Math.max(clientRect.width, 150),
            height,
            left: clientRect.left
        };

        if (window.innerHeight * 2 / 3 < clientRect.top)
            return Object.assign(style, { top: clientRect.top - this.dropdownMargin - height });
        else
            return Object.assign(style, { top: clientRect.bottom + this.dropdownMargin });
    };

    private getFilteredOptions = () => {
        return this.props.options.filter((option: LabelName) =>
            option.name.toLowerCase().includes(this.state.filterQuery.toLowerCase())
        );
    };

    private selectOption = (id: string) => {
        this.setState({ isOpen: false });
        window.removeEventListener(EventType.MOUSE_DOWN, this.closeDropdown);
        this.props.onSelectLabel(this.props.id, id);
        this.props.updateHighlightedLabelId(null);
        this.props.updateActiveLabelId(this.props.id);
    };

    private handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            filterQuery: event.target.value,
            selectedIndex: 0
        });
    };

    private handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        const filteredOptions = this.getFilteredOptions();
        if (event.key === 'ArrowDown') {
            this.setState({
                selectedIndex: (this.state.selectedIndex + 1) % filteredOptions.length
            });
        } else if (event.key === 'ArrowUp') {
            this.setState({
                selectedIndex: (this.state.selectedIndex - 1 + filteredOptions.length) % filteredOptions.length
            });
        } else if (event.key === 'Enter') {
            if (filteredOptions.length > 0) {
                this.selectOption(filteredOptions[this.state.selectedIndex].id);
            }
        } else if (event.key === 'Escape') {
            this.setState({ isOpen: false });
            window.removeEventListener(EventType.MOUSE_DOWN, this.closeDropdown);
        }
    };

    private getDropdownOptions = () => {
        const filteredOptions = this.getFilteredOptions();

        return filteredOptions.map((option: LabelName, index: number) => {
            return <div
                className={classNames('DropdownOption', { 'selected': index === this.state.selectedIndex })}
                key={option.id}
                style={{ height: this.dropdownOptionHeight }}
                onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
                    this.selectOption(option.id);
                    event.stopPropagation();
                }}
            >
                {option.name}
            </div>
        });
    };

    private mouseEnterHandler = () => {
        this.props.updateHighlightedLabelId(this.props.id);
    };

    private mouseLeaveHandler = () => {
        this.props.updateHighlightedLabelId(null);
    };

    private onClickHandler = () => {
        this.props.updateActiveLabelId(this.props.id);
    };

    private getToggleVisibilityButton = (id: string) => {
        if (this.props.toggleLabelVisibility === undefined) {
            return null
        }
        return (
            <ImageButton
                externalClassName={'icon'}
                image={this.props.isVisible ? 'ico/eye.png' : 'ico/hide.png'}
                imageAlt={'label is hidden'}
                buttonSize={{ width: 28, height: 28 }}
                onClick={() => this.props.toggleLabelVisibility(id)}
            />
        )
    }

    public render() {
        const { size, id, value, onDelete } = this.props;
        return (
            <div
                className={this.getClassName()}
                style={{
                    width: size.width,
                    height: size.height,
                }}
                key={id}
                onMouseEnter={this.mouseEnterHandler}
                onMouseLeave={this.mouseLeaveHandler}
                onClick={this.onClickHandler}
            >
                <div
                    className='LabelInputFieldWrapper'
                    style={{
                        width: size.width,
                        height: size.height,
                    }}
                >
                    <div
                        className='Marker'
                        style={value ? { backgroundColor: value.color } : {}}
                    />
                    <div className='Content'>
                        <div className='ContentWrapper'>
                            <div className='DropdownLabel'
                                ref={ref => this.dropdownLabel = ref}
                                onClick={this.openDropdown}
                            >
                                {value ? truncate(value.name, { length: Settings.MAX_DROPDOWN_OPTION_LENGTH }) : 'Select label'}
                            </div>
                            {this.state.isOpen && <div
                                className='Dropdown'
                                style={this.getDropdownStyle()}
                                ref={ref => this.dropdown = ref}
                            >
                                <div className='SearchInputWrapper'>
                                    <input
                                        autoFocus
                                        className='SearchInput'
                                        type='text'
                                        placeholder='Search label...'
                                        value={this.state.filterQuery}
                                        onChange={this.handleSearchChange}
                                        onKeyDown={this.handleSearchKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <Scrollbars
                                    renderTrackHorizontal={props => <div {...props} className='track-horizontal' />}
                                    style={{ height: 'calc(100% - 34px)' }}
                                >
                                    <div>
                                        {this.getDropdownOptions()}
                                    </div>
                                </Scrollbars>

                            </div>}
                        </div>
                        <div className='ContentWrapper'>
                            {this.getToggleVisibilityButton(id)}
                            <ImageButton
                                externalClassName={'icon'}
                                image={'ico/trash.png'}
                                imageAlt={'remove label'}
                                buttonSize={{ width: 28, height: 28 }}
                                onClick={() => onDelete(id)}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

const mapDispatchToProps = {
    updateHighlightedLabelId,
    updateActiveLabelId,
    updateActivePopupType
};

const mapStateToProps = (state: AppState) => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LabelInputField);
