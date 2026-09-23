export interface FieldBackgroundPalette {
    field: string;
    surface: string;
    boundary: string;
    secondary: string;
    light: boolean;
}

export interface FieldBackgroundRendererProps {
    palette: FieldBackgroundPalette;
    motion: number;
    detail: number;
}
