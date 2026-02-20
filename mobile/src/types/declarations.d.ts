/**
 * CoNest - Single Parent Housing Platform
 * Copyright (c) 2025-2026 CoNest. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, or use of this file is strictly prohibited.
 * See LICENSE file in the project root for full license terms.
 */
/**
 * Type declarations for modules without TypeScript definitions
 */

// React Navigation Native Stack
declare module '@react-navigation/native-stack' {
  import { ParamListBase, StackNavigationState, NavigationProp } from '@react-navigation/native';

  export interface NativeStackNavigationOptions {
    title?: string;
    headerShown?: boolean;
    headerTitle?: string | (() => React.ReactNode);
    headerBackTitle?: string;
    headerBackTitleVisible?: boolean;
    headerTintColor?: string;
    headerStyle?: object;
    animation?:
      | 'default'
      | 'fade'
      | 'slide_from_right'
      | 'slide_from_left'
      | 'slide_from_bottom'
      | 'none';
    presentation?:
      | 'card'
      | 'modal'
      | 'transparentModal'
      | 'containedModal'
      | 'containedTransparentModal'
      | 'fullScreenModal'
      | 'formSheet';
    [key: string]: any;
  }

  export type NativeStackNavigationProp<
    ParamList extends ParamListBase,
    RouteName extends keyof ParamList = string,
  > = NavigationProp<ParamList, RouteName>;

  export function createNativeStackNavigator<ParamList extends ParamListBase>(): {
    Navigator: React.ComponentType<any>;
    Screen: React.ComponentType<any>;
    Group: React.ComponentType<any>;
  };
}

// React Native FS
declare module 'react-native-fs' {
  export const DocumentDirectoryPath: string;
  export const TemporaryDirectoryPath: string;
  export const CachesDirectoryPath: string;
  export const ExternalDirectoryPath: string;
  export const ExternalStorageDirectoryPath: string;
  export const LibraryDirectoryPath: string;
  export const MainBundlePath: string;

  export interface ReadDirItem {
    ctime: Date | undefined;
    mtime: Date | undefined;
    name: string;
    path: string;
    size: number;
    isFile: () => boolean;
    isDirectory: () => boolean;
  }

  export interface StatResult {
    name: string | undefined;
    path: string;
    size: number;
    mode: number;
    ctime: Date;
    mtime: Date;
    originalFilepath: string;
    isFile: () => boolean;
    isDirectory: () => boolean;
  }

  export function readDir(dirPath: string): Promise<ReadDirItem[]>;
  export function stat(filepath: string): Promise<StatResult>;
  export function readFile(filepath: string, encoding?: string): Promise<string>;
  export function writeFile(filepath: string, contents: string, encoding?: string): Promise<void>;
  export function appendFile(filepath: string, contents: string, encoding?: string): Promise<void>;
  export function moveFile(filepath: string, destPath: string): Promise<void>;
  export function copyFile(filepath: string, destPath: string): Promise<void>;
  export function unlink(filepath: string): Promise<void>;
  export function exists(filepath: string): Promise<boolean>;
  export function mkdir(
    filepath: string,
    options?: { NSURLIsExcludedFromBackupKey?: boolean }
  ): Promise<void>;
  export function downloadFile(options: {
    fromUrl: string;
    toFile: string;
    headers?: { [key: string]: string };
    background?: boolean;
    progressDivider?: number;
    begin?: (res: any) => void;
    progress?: (res: any) => void;
  }): {
    jobId: number;
    promise: Promise<{ jobId: number; statusCode: number; bytesWritten: number }>;
  };
  export function uploadFiles(options: {
    toUrl: string;
    files: Array<{
      name: string;
      filename: string;
      filepath: string;
      filetype?: string;
    }>;
    method?: string;
    headers?: { [key: string]: string };
    fields?: { [key: string]: string };
    begin?: (res: any) => void;
    progress?: (res: any) => void;
  }): {
    jobId: number;
    promise: Promise<{ jobId: number; statusCode: number; headers: any; body: string }>;
  };
  export function stopDownload(jobId: number): void;
  export function stopUpload(jobId: number): void;
}

// React Native Vector Icons
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/Ionicons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/MaterialIcons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-vector-icons/FontAwesome' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

// React Native Signature Capture
declare module 'react-native-signature-capture' {
  import { Component, RefObject } from 'react';
  import { ViewProps } from 'react-native';

  export interface SignatureCaptureProps extends ViewProps {
    saveImageFileInExtStorage?: boolean;
    showNativeButtons?: boolean;
    showTitleLabel?: boolean;
    viewMode?: 'portrait' | 'landscape';
    maxSize?: number;
    minStrokeWidth?: number;
    maxStrokeWidth?: number;
    strokeColor?: string;
    backgroundColor?: string;
    onSaveEvent?: (result: { encoded: string; pathName: string }) => void;
    onDragEvent?: () => void;
  }

  export default class SignatureCapture extends Component<SignatureCaptureProps> {
    saveImage(): void;
    resetImage(): void;
  }
}

// React Native IAP type augmentation
declare module 'react-native-iap' {
  export interface Product {
    productId: string;
    title: string;
    description: string;
    price: string;
    localizedPrice: string;
    currency: string;
    [key: string]: any;
  }

  export interface Subscription {
    productId: string;
    title: string;
    description: string;
    price: string;
    localizedPrice: string;
    currency: string;
    subscriptionPeriodAndroid?: string;
    [key: string]: any;
  }

  export interface Purchase {
    productId: string;
    transactionId?: string;
    transactionDate?: number;
    transactionReceipt?: string;
    purchaseToken?: string;
    [key: string]: any;
  }

  export interface SubscriptionPurchase extends Purchase {
    autoRenewingAndroid?: boolean;
  }

  export interface PurchaseError {
    code: string;
    message: string;
    [key: string]: any;
  }

  export function initConnection(): Promise<boolean>;
  export function endConnection(): Promise<void>;
  export function getProducts(options: { skus: string[] }): Promise<Product[]>;
  export function getSubscriptions(options: { skus: string[] }): Promise<Subscription[]>;
  export function requestPurchase(options: { sku: string; [key: string]: any }): Promise<Purchase>;
  export function requestSubscription(options: {
    sku: string;
    [key: string]: any;
  }): Promise<SubscriptionPurchase>;
  export function finishTransaction(options: {
    purchase: Purchase | SubscriptionPurchase;
    isConsumable: boolean;
  }): Promise<void>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function purchaseUpdatedListener(
    callback: (purchase: Purchase | SubscriptionPurchase) => void
  ): { remove: () => void };
  export function purchaseErrorListener(callback: (error: PurchaseError) => void): {
    remove: () => void;
  };
}

// React Native Gifted Chat additional types
declare module 'react-native-gifted-chat' {
  import { Component, ReactNode } from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface IMessage {
    _id: string | number;
    text: string;
    createdAt: Date | number;
    user: {
      _id: string | number;
      name?: string;
      avatar?: string;
    };
    image?: string;
    video?: string;
    audio?: string;
    system?: boolean;
    sent?: boolean;
    received?: boolean;
    pending?: boolean;
  }

  export interface GiftedChatProps {
    messages?: IMessage[];
    user?: { _id: string | number; name?: string; avatar?: string };
    onSend?: (messages: IMessage[]) => void;
    renderBubble?: (props: any) => ReactNode;
    renderSend?: (props: any) => ReactNode;
    renderInputToolbar?: (props: any) => ReactNode;
    placeholder?: string;
    alwaysShowSend?: boolean;
    scrollToBottom?: boolean;
    scrollToBottomComponent?: () => ReactNode;
    [key: string]: any;
  }

  export interface BubbleProps {
    wrapperStyle?: { left?: ViewStyle; right?: ViewStyle };
    textStyle?: { left?: TextStyle; right?: TextStyle };
    currentMessage?: IMessage;
    [key: string]: any;
  }

  export interface SendProps {
    containerStyle?: ViewStyle;
    children?: ReactNode;
    [key: string]: any;
  }

  export class GiftedChat extends Component<GiftedChatProps> {
    static append(
      currentMessages: IMessage[],
      messages: IMessage[],
      inverted?: boolean
    ): IMessage[];
    static prepend(
      currentMessages: IMessage[],
      messages: IMessage[],
      inverted?: boolean
    ): IMessage[];
  }
  export class Bubble extends Component<BubbleProps> {}
  export class Send extends Component<SendProps> {}
}
