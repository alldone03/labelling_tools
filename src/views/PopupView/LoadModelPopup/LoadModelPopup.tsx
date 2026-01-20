import React, { useState } from 'react';
import { PopupActions } from '../../../logic/actions/PopupActions';
import { GenericYesNoPopup } from '../GenericYesNoPopup/GenericYesNoPopup';
import { SSDObjectDetector } from '../../../ai/SSDObjectDetector';
import './LoadModelPopup.scss'
import { ClipLoader } from 'react-spinners';
import { AIModel } from '../../../data/enums/AIModel';
import { PoseDetector } from '../../../ai/PoseDetector';
import { AIBackendObjectDetectionActions } from '../../../logic/actions/AIBackendObjectDetectionActions';
import { backendService } from '../../../services/backendService';
import { findLast } from 'lodash';
import { CSSHelper } from '../../../logic/helpers/CSSHelper';
import { updateActivePopupType as storeUpdateActivePopupType } from '../../../store/general/actionCreators';
import { AppState } from '../../../store';
import { connect } from 'react-redux';
import { PopupWindowType } from '../../../data/enums/PopupWindowType';
import { GeneralActionTypes } from '../../../store/general/types';
import { updateAIBackendObjectDetectorStatus } from '../../../store/ai/actionCreators';

interface SelectableModel {
    model: AIModel,
    name: string,
    flag: boolean
}

const models: SelectableModel[] = [
    {
        model: AIModel.BACKEND_OBJECT_DETECTION,
        name: 'YOLO (Backend) - object detection using server',
        flag: false
    },
    {
        model: AIModel.YOLO_V5_OBJECT_DETECTION,
        name: 'YOLOv5 - object detection using rectangles',
        flag: false
    },
    {
        model: AIModel.SSD_OBJECT_DETECTION,
        name: 'COCO SSD - object detection using rectangles',
        flag: false
    },
    {
        model: AIModel.POSE_DETECTION,
        name: 'POSE-NET - pose estimation using points',
        flag: false
    }
];

interface IProps {
    updateActivePopupType: (activePopupType: PopupWindowType) => GeneralActionTypes;
    updateAIBackendObjectDetectorStatus: (isLoaded: boolean) => any;
}

const LoadModelPopup: React.FC<IProps> = ({ updateActivePopupType, updateAIBackendObjectDetectorStatus }) => {
    const [modelIsLoadingStatus, setModelIsLoadingStatus] = useState(false);
    const [selectedModelToLoad, updateSelectedModelToLoad] = useState(models);
    const [backendUrl, setBackendUrl] = useState(backendService.getBaseUrl());

    const extractSelectedModel = (): AIModel => {
        const model: SelectableModel = findLast(selectedModelToLoad, { flag: true });
        if (!!model) {
            return model.model
        } else {
            return null;
        }
    };

    const onAccept = async () => {
        setModelIsLoadingStatus(true);
        switch (extractSelectedModel()) {
            case AIModel.BACKEND_OBJECT_DETECTION:
                // Update backend URL
                backendService.setBaseUrl(backendUrl);

                // Check backend availability
                const isBackendAvailable = await backendService.healthCheck();
                if (isBackendAvailable) {
                    updateAIBackendObjectDetectorStatus(true);
                    // Trigger detection for active image
                    AIBackendObjectDetectionActions.detectRectsForActiveImage();
                    PopupActions.close();
                } else {
                    alert(`Backend server tidak tersedia di ${backendUrl}. Pastikan server berjalan.`);
                    setModelIsLoadingStatus(false);
                }
                break;
            case AIModel.POSE_DETECTION:
                PoseDetector.loadModel(() => {
                    PopupActions.close();
                });
                break;
            case AIModel.SSD_OBJECT_DETECTION:
                SSDObjectDetector.loadModel(() => {
                    PopupActions.close();
                });
                break;
            case AIModel.YOLO_V5_OBJECT_DETECTION:
                updateActivePopupType(PopupWindowType.LOAD_YOLO_V5_MODEL);
                break;
        }
    };

    const onSelect = (selectedModel: AIModel) => {
        const nextSelectedModelToLoad: SelectableModel[] = selectedModelToLoad.map((model: SelectableModel) => {
            if (model.model === selectedModel)
                return {
                    ...model,
                    flag: !model.flag
                };
            else
                return {
                    ...model,
                    flag: false
                };
        });
        updateSelectedModelToLoad(nextSelectedModelToLoad);
    };

    const getOptions = () => {
        return selectedModelToLoad.map((entry: SelectableModel) => {
            return <div
                className='OptionsItem'
                onClick={() => onSelect(entry.model)}
                key={entry.model}
            >
                {entry.flag ?
                    <img
                        draggable={false}
                        src={'ico/checkbox-checked.png'}
                        alt={'checked'}
                    /> :
                    <img
                        draggable={false}
                        src={'ico/checkbox-unchecked.png'}
                        alt={'unchecked'}
                    />}
                {entry.name}
            </div>
        })
    };

    const onReject = () => {
        PopupActions.close();
    };

    const renderContent = () => {
        return <div className='LoadModelPopupContent'>
            <div className='Message'>
                Speed up your annotation process using AI. Don't worry, your photos are still safe. To take care of
                your privacy, we decided not to send your images to the server, but instead bring AI to you. Make sure
                that you have a fast and stable connection - it may take a while to load the model.
            </div>

            {extractSelectedModel() === AIModel.BACKEND_OBJECT_DETECTION && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', fontSize: '12px' }}>
                    <div style={{ marginBottom: '10px' }}>
                        <strong>Backend URL:</strong>
                        <input
                            type="text"
                            value={backendUrl}
                            onChange={(e) => setBackendUrl(e.target.value)}
                            style={{ width: '100%', padding: '5px', marginTop: '5px', color: 'black' }}
                        />
                    </div>
                    <div style={{ color: '#666' }}>
                        <strong>Info:</strong> Backend harus mengembalikan respon JSON dengan format:
                        <pre style={{ background: '#eee', padding: '5px', marginTop: '5px' }}>
                            {`{
  "success": true,
  "annotations": [
    { "bbox": [x, y, w, h], "class": "label", "score": 0.9 }
  ]
}`}
                        </pre>
                    </div>
                </div>
            )}

            <div className='Companion'>
                {modelIsLoadingStatus ?
                    <ClipLoader
                        size={40}
                        color={CSSHelper.getLeadingColor()}
                        loading={true}
                    /> :
                    <div className='Options'>
                        {getOptions()}
                    </div>
                }
            </div>
        </div>
    };

    return (
        <GenericYesNoPopup
            title={'Say hello to AI'}
            renderContent={renderContent}
            acceptLabel={'Use model!'}
            onAccept={onAccept}
            disableAcceptButton={modelIsLoadingStatus || !extractSelectedModel()}
            rejectLabel={"I'm going on my own"}
            onReject={onReject}
            disableRejectButton={modelIsLoadingStatus}
        />
    );
};

const mapDispatchToProps = {
    updateActivePopupType: storeUpdateActivePopupType,
    updateAIBackendObjectDetectorStatus: updateAIBackendObjectDetectorStatus
};

const mapStateToProps = (state: AppState) => ({});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(LoadModelPopup);
