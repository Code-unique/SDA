'use client'

import UltraFastVideoPlayer from '@/components/ui/ultra-fast-video-player'

const TestPage = () => {
  return (
    <div style={{ padding: 24, display: 'grid', gap: 32 }}>
      {/* Test with MP4 */}
      <section>
        <h2>MP4 Test (Big Buck Bunny)</h2>
        <UltraFastVideoPlayer
          src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
          poster="https://peach.blender.org/wp-content/uploads/bbb-splash.png"
          autoplay={false}
          playsInline
          controls
          muted={false}
        />
      </section>

      {/* Test with HLS */}
      <section>
        <h2>HLS Test</h2>
        <UltraFastVideoPlayer
          src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
          autoplay={false}
          playsInline
          controls
        />
      </section>

      {/* Test with S3 MOV (QuickTime) */}
      <section>
        <h2>S3 MOV Test (Imported Lesson Video)</h2>
        <UltraFastVideoPlayer
          src="https://sutra-courses-unique.s3.amazonaws.com/courses/lessonVideos/1767257540486-ld8ve9t3.mov"
          autoplay={false}
          playsInline
          controls
          muted={false}
        />
      </section>
    </div>
  )
}

export default TestPage
