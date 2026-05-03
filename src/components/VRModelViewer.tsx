import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    Text,
    ActivityIndicator,
} from 'react-native';
import { VocabularyItem } from '../types/vocabulary';
import {
    getModelAsset,
    getMaterialAsset,
    getModelType,
} from '../utils/assetLoader';

import {
    ViroVRSceneNavigator,
    ViroScene,
    ViroAmbientLight,
    ViroSpotLight,
    Viro3DObject,
    ViroNode,
    ViroAnimations,
    ViroBox,
    ViroMaterials,
    ViroText,
    ViroSkyBox,
} from '@reactvision/react-viro';

interface VRModelViewerProps {
    item: VocabularyItem;
    onModelLoaded?: () => void;
    onModelTapped?: () => void;
}

/**
 * VRModelViewer Component
 * 
 * Implements immersive VR mode with stereo rendering for Cardboard/VR Headsets.
 * Uses ViroVRSceneNavigator instead of ViroARSceneNavigator.
 */
export const VRModelViewer: React.FC<VRModelViewerProps> = ({
    item,
    onModelLoaded,
    onModelTapped,
}) => {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <View style={styles.vrScene}>
            <ViroVRSceneNavigator
                autofocus={true}
                vrModeEnabled={true}
                initialScene={{
                    scene: () => (
                        <VRSceneComponent
                            item={item}
                            onModelLoaded={onModelLoaded}
                            onModelTapped={onModelTapped}
                            onInitialized={() => setIsLoading(false)}
                        />
                    ),
                }}
                style={styles.viroContainer}
            />

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loadingText}>Loading VR World...</Text>
                </View>
            )}
        </View>
    );
};

interface VRSceneComponentProps {
    item: VocabularyItem;
    onModelLoaded?: () => void;
    onModelTapped?: () => void;
    onInitialized: () => void;
}

const VRSceneComponent: React.FC<VRSceneComponentProps> = ({
    item,
    onModelLoaded,
    onModelTapped,
    onInitialized,
}) => {
    const modelFileType = getModelType(item.modelPath);
    // Pinch-to-zoom, drag, and touch-based rotation state
    const [modelScale, setModelScale] = useState(1.0);
    const [modelPosition, setModelPosition] = useState<[number, number, number]>([0, -0.2, -2.5]);
    const [modelRotation, setModelRotation] = useState<[number, number, number]>(
        item.rotation as [number, number, number]
    );
    // Tracks Y angle at rotate gesture start to avoid stale-closure drift
    const rotStartY = useRef(0);

    useEffect(() => {
        onInitialized();
    }, [onInitialized]);

    // Register animations & materials
    useEffect(() => {
        ViroAnimations.registerAnimations({
            rotate: {
                properties: { rotateY: '+=360' },
                duration: 5000,
                easing: 'Linear',
            },
        });

        ViroMaterials.createMaterials({
            groundMaterial: {
                lightingModel: 'Blinn',
                diffuseColor: '#2d3748', // Lighter slate for better contrast
            },
            letterMaterial: {
                lightingModel: 'Blinn',
                diffuseColor: item.textureColor || '#3b82f6',
                shininess: 0.5,
            },
        });
    }, [item.textureColor]);

    const getModelSource = () => {
        const asset = getModelAsset(item.modelPath);
        return asset;
    };

    const getResourcesForOBJ = () => {
        if (modelFileType !== 'OBJ') return undefined;
        return getMaterialAsset(item.modelPath);
    };

    return (
        <ViroScene>
            {/* Immersive Environment - Lighter Sky for better silhouettes */}
            <ViroSkyBox color="#1a202c" />

            <ViroAmbientLight color="#ffffff" intensity={500} />
            <ViroSpotLight
                innerAngle={5}
                outerAngle={25}
                direction={[0, -1, 0]}
                position={[0, 5, -2]}
                color="#ffffff"
                castsShadow={true}
                intensity={1500}
            />

            {/* Ground plane with grid for perspective */}
            <ViroBox
                position={[0, -1.5, -2]}
                scale={[20, 0.01, 20]}
                materials={['groundMaterial']}
            />

            {/* Vocabulary Item in VR — static, draggable, pinch-to-zoom, twist-to-rotate */}
            <ViroNode
                position={modelPosition}
                dragType="FixedDistance"
                onDrag={(dragToPos: number[]) => {
                    setModelPosition(dragToPos as [number, number, number]);
                }}
                onPinch={(pinchState: number, scaleFactor: number, _source: any) => {
                    if (pinchState === 3) {
                        setModelScale(prev => Math.min(Math.max(prev * scaleFactor, 0.3), 5.0));
                    }
                }}
                onRotate={(rotateState: number, rotationFactor: number, _source: any) => {
                    if (rotateState === 1) {
                        rotStartY.current = modelRotation[1];
                    } else if (rotateState === 2) {
                        setModelRotation([
                            modelRotation[0],
                            rotStartY.current - rotationFactor,
                            modelRotation[2],
                        ]);
                    }
                }}
            >
                {item.modelPath === 'internal:cube' ? (
                    // Cube rotated via modelRotation
                    <ViroNode rotation={modelRotation}>
                        <ViroBox
                            position={[0, 0, 0]}
                            scale={[0.8 * modelScale, 0.8 * modelScale, 0.8 * modelScale]}
                            materials={['letterMaterial']}
                            onClick={onModelTapped}
                        />
                        <ViroText
                            text={item.word}
                            position={[0, 0, 0.41]}
                            width={1}
                            height={1}
                            style={{
                                fontFamily: 'Arial',
                                fontSize: 50,
                                color: '#ffffff',
                                textAlign: 'center',
                                textAlignVertical: 'center',
                            }}
                        />
                    </ViroNode>
                ) : (
                    // 3D object rotated via modelRotation (user-controlled)
                    <Viro3DObject
                        source={getModelSource() as any}
                        resources={getResourcesForOBJ()}
                        position={[0, 0, 0]}
                        scale={item.scale.map((s: number) => s * 3 * modelScale) as [number, number, number]}
                        rotation={modelRotation}
                        type={modelFileType}
                        onLoadEnd={onModelLoaded}
                        onClick={onModelTapped}
                        lightReceivingBitMask={1}
                        shadowCastingBitMask={1}
                    />
                )}
            </ViroNode>

            {/* Immersive 3D Text Title - Moved higher and further */}
            <ViroText
                text={`Practice: ${item.word}`}
                position={[0, 1.2, -3.5]}
                width={4}
                height={2}
                style={{
                    fontFamily: 'Arial',
                    fontSize: 40,
                    color: '#ffffff',
                    fontWeight: 'bold',
                    textAlign: 'center',
                }}
            />
        </ViroScene>
    );
};

const styles = StyleSheet.create({
    vrScene: { flex: 1 },
    viroContainer: { flex: 1 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default VRModelViewer;
