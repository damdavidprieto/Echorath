/**
 * Type declarations for Echorath UI.
 * Available as window.EchorathUI (IIFE build) or as named exports (ESM build).
 */

export type Variant =
    | 'standard'
    | 'flicker'
    | 'glitch'
    | 'scan'
    | 'wave'
    | 'shatter'
    | 'warp'
    | 'static'
    | 'decode';

export type Tone =
    | 'ok' | 'success'
    | 'info'
    | 'warn' | 'warning'
    | 'danger' | 'error'
    | 'sys'
    | 'off' | 'offline';

export type Target = Element | string;

export interface LoadOptions {
    /** Distortion to play. Defaults to data-distort, then the configured default. */
    variant?: Variant;
}

export interface ReadyOptions {
    /** Play the reveal animation when loading ends. Default true. */
    reveal?: boolean;
    /** Tone to apply when loading ends. */
    tone?: Tone;
}

export type WaitOptions = LoadOptions & ReadyOptions;

export interface Config {
    defaultVariant: Variant;
    revealMs: number;
    noiseIntervalMs: number;
    decodeScrambleMs: number;
    decodeRevealStepMs: number;
    toastMs: number;
}

export interface ModalAction<T = unknown> {
    label: string;
    value?: T;
    variant?: 'ghost' | 'solid' | 'danger' | 'warn' | 'info';
}

export interface ModalOptions<T = unknown> {
    title?: string;
    body?: string | Node;
    tone?: Tone;
    /** 'md' (420px, default) or 'lg' (720px, for reading or images). */
    size?: 'md' | 'lg';
    actions?: ModalAction<T>[];
}

/**
 * What modal() returns: a promise for the chosen value that is also a handle
 * to the open dialog, for content that changes while it is open.
 */
export interface ModalHandle<T = unknown> extends Promise<T | undefined> {
    /** The dialog element (.e-modal). */
    readonly element: HTMLElement;
    /** New title; it is also the dialog's accessible name. */
    setTitle(title: string): void;
    /** New body, as text or a node; the body scrolls back to the top. */
    setBody(body: string | Node): void;
    /** Close the dialog, resolving the promise with value. Safe to call twice. */
    close(value?: T): void;
}

export interface FxPickerOptions {
    /** Name of the target, used in the group's accessible label ("Efectos de …"). */
    name?: string;
    /** Variants to offer, in order. Default: all; "decode" only for text-only targets. */
    variants?: Variant[];
    /** How long each effect plays, in ms. Default 1600. */
    duration?: number;
    /** Show the options from the start. Default false. */
    open?: boolean;
    /** Toggle text. Default "Efectos". */
    label?: string;
}

export declare const version: string;
export declare const variants: Variant[];

export declare function init(root?: ParentNode): void;
export declare function configure(options?: Partial<Config>): Config;

export declare function load(target: Target, options?: LoadOptions): Element | null;
export declare function ready(target: Target, options?: ReadyOptions): void;
export declare function wait<T>(target: Target, promise: Promise<T> | T, options?: WaitOptions): Promise<T>;
export declare function loadFor(target: Target, ms?: number, options?: WaitOptions): Promise<void>;

export declare function tone(target: Target, name: Tone): void;
export declare function initHeaders(root?: ParentNode): void;
export declare function initTabs(root?: ParentNode): void;
export declare function toast(title: string, message?: string, tone?: Tone, ms?: number): HTMLElement;
export declare function modal<T = unknown>(options?: ModalOptions<T>): ModalHandle<T>;
export declare function fxPicker(target: Target, options?: FxPickerOptions): HTMLElement;

declare global {
    interface Window {
        EchorathUI: {
            version: typeof version;
            variants: typeof variants;
            init: typeof init;
            configure: typeof configure;
            load: typeof load;
            ready: typeof ready;
            wait: typeof wait;
            loadFor: typeof loadFor;
            tone: typeof tone;
            initHeaders: typeof initHeaders;
            initTabs: typeof initTabs;
            toast: typeof toast;
            modal: typeof modal;
            fxPicker: typeof fxPicker;
        };
    }
}
