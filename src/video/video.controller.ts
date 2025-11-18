import { Controller, Post, Get, Res, Req, UploadedFile, UseInterceptors, StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, Request } from 'express';
import { VideoService } from './video.service';
import { Observable, from } from 'rxjs';
import { Chunk, StreamVideoRequest } from '../protos/generated/demokratie';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: any) {
    console.log('=== VIDEO UPLOAD STARTED ===');
    console.log('File info:', {
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      fieldname: file?.fieldname,
      bufferLength: file?.buffer?.length
    });

    if (!file || !file.buffer) {
      console.error('❌ No file or buffer received');
      throw new Error('No file uploaded');
    }

    console.log(`📁 Processing file: ${file.originalname} (${file.size} bytes)`);
    
    // Convert file to chunks and create observable
    const chunks = this.createChunksFromFile(file);
    console.log('📦 Chunks observable created, sending to gRPC service...');
    
    try {
      const result = await this.videoService.uploadVideo(chunks);
      console.log('✅ Upload completed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw error;
    }
  }

  @Get(':id')
  async streamVideoById(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const videoId = req.params.id;
    console.log('🎬 Stream request received:', { videoId });
    const videoIdNumber = parseInt(videoId, 10);
    if (isNaN(videoIdNumber)) {
      res.status(400).json({
        error: 'Invalid video ID',
        message: 'Video ID must be a valid number',
        example: 'Use /video/1'
      });
      return new StreamableFile(Buffer.alloc(0));
    }
    const request: StreamVideoRequest = { videoId: videoIdNumber };
    const streamId = `stream_${videoId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🚀 [${streamId}] Sending stream request to gRPC:`, request);
    const rangeHeader = req.headers.range;
    let startByte = 0;
    let endByte: number | undefined;
    if (rangeHeader) {
      const rangeMatch = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (rangeMatch) {
        startByte = parseInt(rangeMatch[1], 10);
        if (rangeMatch[2]) {
          endByte = parseInt(rangeMatch[2], 10);
        }
        console.log(`📍 [${streamId}] Range request: ${startByte}-${endByte || 'end'}`);
      }
    }
    // Collect all chunks into a buffer
    const chunks$ = this.videoService.streamVideo(request);
    const buffers: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      chunks$.subscribe({
        next: (chunk) => {
          buffers.push(Buffer.from(chunk.data));
        },
        complete: () => resolve(),
        error: (err) => reject(err)
      });
    });
    const videoBuffer = Buffer.concat(buffers);
    res.set({
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Length': videoBuffer.length
    });
    // Handle range requests
    if (rangeHeader) {
      if (startByte >= videoBuffer.length) {
        res.status(416).setHeader('Content-Range', `bytes */${videoBuffer.length}`);
        return new StreamableFile(Buffer.alloc(0));
      }
      endByte = endByte !== undefined ? Math.min(endByte, videoBuffer.length - 1) : videoBuffer.length - 1;
      const contentLength = endByte - startByte + 1;
      res.status(206).set({
        'Content-Range': `bytes ${startByte}-${endByte}/${videoBuffer.length}`,
        'Content-Length': contentLength
      });
      return new StreamableFile(videoBuffer.slice(startByte, endByte + 1));
    }
    return new StreamableFile(videoBuffer);
  }

  private createChunksFromFile(file: any): Observable<Chunk> {
    const chunkSize = 65536; // 64KB chunks
    const chunks: Chunk[] = [];
    const totalSize = file.buffer.length;
    const expectedChunks = Math.ceil(totalSize / chunkSize);
    
    console.log(`🔧 Creating chunks from file:`);
    console.log(`   File size: ${totalSize} bytes`);
    console.log(`   Chunk size: ${chunkSize} bytes`);
    console.log(`   Expected chunks: ${expectedChunks}`);
    
    for (let i = 0; i < file.buffer.length; i += chunkSize) {
      const chunkData = file.buffer.slice(i, i + chunkSize);
      const chunkNumber = Math.floor(i / chunkSize);
      const isLast = i + chunkSize >= file.buffer.length;
      
      const chunk: Chunk = {
        title: file.originalname || 'unknown',
        data: chunkData,
        chunkNumber,
        isLast,
      };
      
      console.log(`📦 Chunk ${chunkNumber + 1}/${expectedChunks}:`, {
        chunkNumber,
        dataSize: chunkData.length,
        isLast,
        title: chunk.title,
        startByte: i,
        endByte: Math.min(i + chunkSize - 1, totalSize - 1)
      });
      
      chunks.push(chunk);
    }
    
    console.log(`✅ Created ${chunks.length} chunks total`);
    return from(chunks);
  }
}
