// src/components/ui/Stepper.tsx
// Design System 2.0 - Stepper/Progress Component
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Theme from '../../styles/theme';

export interface Step {
    id: string | number;
    title: string;
    description?: string;
}

interface StepperProps {
    steps: Step[];
    currentStep: number;
    onStepPress?: (stepIndex: number) => void;
    orientation?: 'horizontal' | 'vertical';
    style?: ViewStyle;
}

export function Stepper({
    steps,
    currentStep,
    onStepPress,
    orientation = 'horizontal',
    style,
}: StepperProps) {
    const isHorizontal = orientation === 'horizontal';

    return (
        <View
            style={[
                styles.container,
                isHorizontal ? styles.horizontal : styles.vertical,
                style,
            ]}
        >
            {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isClickable = onStepPress && (isCompleted || isCurrent);

                return (
                    <React.Fragment key={step.id}>
                        <TouchableOpacity
                            onPress={() => isClickable && onStepPress?.(index)}
                            disabled={!isClickable}
                            style={[
                                styles.stepItem,
                                isHorizontal ? styles.stepHorizontal : styles.stepVertical,
                            ]}
                            activeOpacity={isClickable ? 0.7 : 1}
                        >
                            <View
                                style={[
                                    styles.stepCircle,
                                    isCompleted && styles.stepCompleted,
                                    isCurrent && styles.stepCurrent,
                                ]}
                            >
                                {isCompleted ? (
                                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                ) : (
                                    <Text
                                        style={[
                                            styles.stepNumber,
                                            isCurrent && styles.stepNumberCurrent,
                                        ]}
                                    >
                                        {index + 1}
                                    </Text>
                                )}
                            </View>
                            <View style={isHorizontal ? styles.labelHorizontal : styles.labelVertical}>
                                <Text
                                    style={[
                                        styles.stepTitle,
                                        (isCompleted || isCurrent) && styles.stepTitleActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {step.title}
                                </Text>
                                {step.description && !isHorizontal && (
                                    <Text style={styles.stepDescription} numberOfLines={2}>
                                        {step.description}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        {index < steps.length - 1 && (
                            <View
                                style={[
                                    styles.connector,
                                    isHorizontal ? styles.connectorHorizontal : styles.connectorVertical,
                                    isCompleted && styles.connectorCompleted,
                                ]}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </View>
    );
}

// Simple progress bar alternative
interface ProgressBarProps {
    progress: number; // 0-100
    height?: number;
    color?: string;
    backgroundColor?: string;
    showLabel?: boolean;
    style?: ViewStyle;
}

export function ProgressBar({
    progress,
    height = 8,
    color = Theme.colors.primary,
    backgroundColor = Theme.colors.surfaceLight,
    showLabel = false,
    style,
}: ProgressBarProps) {
    const clampedProgress = Math.min(100, Math.max(0, progress));

    return (
        <View style={style}>
            <View
                style={[
                    progressStyles.track,
                    { height, backgroundColor, borderRadius: height / 2 },
                ]}
            >
                <View
                    style={[
                        progressStyles.fill,
                        {
                            width: `${clampedProgress}%`,
                            backgroundColor: color,
                            borderRadius: height / 2,
                        },
                    ]}
                />
            </View>
            {showLabel && (
                <Text style={progressStyles.label}>{Math.round(clampedProgress)}%</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {},
    horizontal: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    vertical: {
        flexDirection: 'column',
    },
    stepItem: {
        alignItems: 'center',
    },
    stepHorizontal: {
        flex: 1,
    },
    stepVertical: {
        flexDirection: 'row',
        paddingVertical: Theme.spacing.sm,
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Theme.colors.surfaceLight,
        borderWidth: 2,
        borderColor: Theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepCompleted: {
        backgroundColor: Theme.colors.success,
        borderColor: Theme.colors.success,
    },
    stepCurrent: {
        borderColor: Theme.colors.primary,
        backgroundColor: Theme.colors.surface,
    },
    stepNumber: {
        ...Theme.typography.caption,
        color: Theme.colors.textMuted,
        fontWeight: '600',
    },
    stepNumberCurrent: {
        color: Theme.colors.primary,
    },
    labelHorizontal: {
        marginTop: Theme.spacing.xs,
        alignItems: 'center',
    },
    labelVertical: {
        marginLeft: Theme.spacing.md,
        flex: 1,
    },
    stepTitle: {
        ...Theme.typography.bodySmall,
        color: Theme.colors.textMuted,
    },
    stepTitleActive: {
        color: Theme.colors.textPrimary,
        fontWeight: '500',
    },
    stepDescription: {
        ...Theme.typography.caption,
        color: Theme.colors.textMuted,
        marginTop: 2,
    },
    connector: {
        backgroundColor: Theme.colors.border,
    },
    connectorHorizontal: {
        flex: 1,
        height: 2,
        marginTop: 15,
        marginHorizontal: Theme.spacing.xs,
    },
    connectorVertical: {
        width: 2,
        height: Theme.spacing.lg,
        marginLeft: 15,
    },
    connectorCompleted: {
        backgroundColor: Theme.colors.success,
    },
});

const progressStyles = StyleSheet.create({
    track: {
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
    },
    label: {
        ...Theme.typography.caption,
        color: Theme.colors.textSecondary,
        textAlign: 'right',
        marginTop: Theme.spacing.xs,
    },
});

export default Stepper;
