import axios from 'axios';

// API URL handled in BackendService class

export interface Annotation {
    bbox: number[]; // [x, y, width, height]
    class: string;
    score: number;
}

export interface AnnotationResponse {
    success: boolean;
    annotations: Annotation[];
    count: number;
    error?: string;
}

class BackendService {
    private baseUrl: string = 'http://localhost:8000';

    setBaseUrl(url: string) {
        this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash if present
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Send image to backend for YOLO annotation
     * @param file - Image file to annotate
     * @returns Promise with annotation results
     */
    async annotateImage(file: File): Promise<AnnotationResponse> {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post<AnnotationResponse>(
                `${this.baseUrl}/annotate`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        } catch (error) {
            console.error('Error calling backend API:', error);
            return {
                success: false,
                annotations: [],
                count: 0,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Check if backend server is running
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.baseUrl}/`);
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}

export const backendService = new BackendService();
