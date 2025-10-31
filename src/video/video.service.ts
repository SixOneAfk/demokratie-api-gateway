import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, tap } from 'rxjs';
import { 
  VideoServiceClient, 
  Chunk, 
  UploadVideoResponse, 
  StreamVideoRequest 
} from '../protos/generated/demokratie';

@Injectable()
export class VideoService implements OnModuleInit {
  private videoService: VideoServiceClient;

  constructor(@Inject('VideoService') private client: ClientGrpc) {}

  onModuleInit() {
    this.videoService = this.client.getService<VideoServiceClient>('VideoService');
    console.log('🔌 VideoService gRPC client initialized');
  }

  uploadVideo(chunks: Observable<Chunk>): Observable<UploadVideoResponse> {
    console.log('🚀 Sending chunks to gRPC VideoService...');
    
    let chunkCount = 0;
    // Add logging to monitor chunks being sent
    const loggedChunks = chunks.pipe(
      tap((chunk) => {
        chunkCount++;
        console.log(`➡️  Sending chunk ${chunkCount} to gRPC:`, {
          chunkNumber: chunk.chunkNumber,
          title: chunk.title,
          dataSize: chunk.data.length,
          isLast: chunk.isLast,
          totalBytesSent: chunkCount * chunk.data.length
        });
      })
    );

    return this.videoService.uploadVideo(loggedChunks).pipe(
      tap({
        next: (response) => {
          console.log('📥 Received response from gRPC:', response);
        },
        error: (error) => {
          console.error('❌ gRPC upload error:', error);
        },
        complete: () => {
          console.log(`✅ gRPC upload stream completed. Total chunks sent: ${chunkCount}`);
        }
      })
    );
  }

  streamVideo(request: StreamVideoRequest): Observable<Chunk> {
    console.log('🎬 Starting video stream from gRPC:', request);
    return this.videoService.streamVideo(request);
  }
}
