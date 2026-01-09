'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Video,
  Clock,
  HardDrive,
  Calendar,
  X,
  Play,
  Eye,
  BarChart3,
  TrendingUp,
  Grid,
  List,
  Upload,
  RefreshCw,
  Trash2,
  Copy,
  Database,
  Cloud,
  AlertCircle,
  Import,
  FileDown,
  Folder,
  Check,
  AlertTriangle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface VideoLibraryItem {
  _id: string
  title: string
  description?: string
  video: {
    key: string
    url: string
    size: number
    duration?: number
    originalFileName: string
  }
  uploadedBy?: {
    firstName: string
    lastName: string
    username: string
  }
  uploadDate: string
  categories: string[]
  tags: string[]
  usageCount: number
  formattedSize: string
  formattedDuration: string
  thumbnail?: string
}

interface S3VideoItem {
  key: string
  url: string
  size: number
  fileName: string
  folder: string
  lastModified: string
  mimeType?: string
}

export default function VideoLibraryPage() {
  const router = useRouter()
  const [videos, setVideos] = useState<VideoLibraryItem[]>([])
  const [s3Videos, setS3Videos] = useState<S3VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingS3, setLoadingS3] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [selectedS3Videos, setSelectedS3Videos] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('uploadDate')
  const [sortOrder, setSortOrder] = useState('desc')
  const [activeTab, setActiveTab] = useState<'mongodb' | 's3'>('mongodb')
  const [categories, setCategories] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalSize: 0,
    totalUsage: 0,
    avgUsage: 0
  })
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importStatus, setImportStatus] = useState('')

  // Fetch videos from MongoDB
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true)
      console.log('📚 Fetching videos from MongoDB...')
      
      const params = new URLSearchParams({
        limit: '50',
        search: searchQuery,
        sortBy,
        sortOrder,
        ...(selectedCategories.length > 0 && { categories: selectedCategories.join(',') })
      })
      
      const response = await fetch(`/api/admin/video-library?${params}`)
      
      if (!response.ok) {
        console.error('❌ MongoDB fetch failed:', response.status)
        setVideos([])
        return
      }
      
      const data = await response.json()
      console.log('📊 MongoDB response:', { count: data.videos?.length || 0 })
      
      setVideos(data.videos || [])
      setCategories(data.filters?.categories || [])
      setStats({
        totalVideos: data.filters?.totalVideos || 0,
        totalSize: data.filters?.totalSize || 0,
        totalUsage: data.filters?.usageStats?.totalUsage || 0,
        avgUsage: data.filters?.usageStats?.avgUsage || 0
      })
      
    } catch (error) {
      console.error('❌ Error fetching MongoDB videos:', error)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedCategories, sortBy, sortOrder])

  // Fetch videos from S3
  const fetchS3Videos = useCallback(async () => {
    try {
      setLoadingS3(true)
      console.log('☁️ Fetching videos from S3...')
      
      const response = await fetch('/api/admin/s3-videos')
      
      if (!response.ok) {
        console.error('❌ S3 fetch failed:', response.status)
        setS3Videos([])
        return
      }
      
      const data = await response.json()
      console.log('📊 S3 response:', { count: data.videos?.length || 0 })
      
      setS3Videos(data.videos || [])
      
    } catch (error) {
      console.error('❌ Error fetching S3 videos:', error)
      setS3Videos([])
    } finally {
      setLoadingS3(false)
    }
  }, [])

  // Import S3 videos to MongoDB
  const importS3Videos = async (selectedKeys: string[]) => {
    if (!selectedKeys.length) {
      alert('Please select videos to import')
      return
    }
    
    try {
      setImporting(true)
      setImportProgress(0)
      setImportStatus('Starting import...')
      
      const videosToImport = s3Videos.filter(v => selectedKeys.includes(v.key))
      let importedCount = 0
      
      for (let i = 0; i < videosToImport.length; i++) {
        const video = videosToImport[i]
        setImportStatus(`Importing ${i + 1}/${videosToImport.length}: ${video.fileName}`)
        setImportProgress(Math.round(((i + 1) / videosToImport.length) * 100))
        
        try {
          const response = await fetch('/api/admin/video-library/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              s3Key: video.key,
              fileName: video.fileName,
              size: video.size,
              folder: video.folder
            })
          })
          
          if (response.ok) {
            importedCount++
          }
        } catch (error) {
          console.error(`Failed to import ${video.key}:`, error)
        }
      }
      
      setImportStatus(`✅ Imported ${importedCount} videos successfully`)
      
      // Refresh both lists
      await Promise.all([
        fetchVideos(),
        fetchS3Videos()
      ])
      
      // Clear selection
      setSelectedS3Videos([])
      
      setTimeout(() => {
        setImporting(false)
        setImportProgress(0)
        setImportStatus('')
        
        if (importedCount > 0) {
          alert(`✅ Successfully imported ${importedCount} videos`)
        }
      }, 2000)
      
    } catch (error) {
      console.error('❌ Import failed:', error)
      setImportStatus('❌ Import failed')
      alert('Import failed. Please check the console.')
    }
  }

  // Delete selected MongoDB videos
  // Delete selected MongoDB videos
const deleteSelectedVideos = async () => {
  if (!selectedVideos.length) {
    alert('Please select videos to delete');
    return;
  }
  
  if (!confirm(`Are you sure you want to delete ${selectedVideos.length} selected videos?`)) {
    return;
  }
  
  try {
    const response = await fetch('/api/admin/video-library/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoIds: selectedVideos })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Remove deleted videos from state
      setVideos(prev => prev.filter(v => !selectedVideos.includes(v._id)));
      setSelectedVideos([]);
      
      // Show success message
      alert(`✅ Successfully deleted ${result.deletedCount} videos`);
      
      // Refresh stats
      fetchVideos();
    } else {
      // Handle videos in use
      if (result.videosInUse) {
        const inUseTitles = result.videosInUse.map((v: any) => v.title).join(', ');
        alert(`❌ Cannot delete videos that are in use:\n${inUseTitles}`);
      } else {
        alert(`❌ Delete failed: ${result.error || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Delete failed:', error);
    alert('❌ Failed to delete videos. Please check console for details.');
  }
};

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const response = await fetch('/api/admin/video-library/export')
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `video-library-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      alert('✅ Export completed!')
    } catch (error) {
      console.error('Export error:', error)
      alert('❌ Export failed')
    }
  }

  // Initial load
  useEffect(() => {
    fetchVideos()
    fetchS3Videos()
  }, [])

  // Toggle selection
  const toggleVideoSelection = (id: string) => {
    setSelectedVideos(prev => 
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    )
  }

  const toggleS3VideoSelection = (key: string) => {
    setSelectedS3Videos(prev => 
      prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key]
    )
  }

  const selectAllS3Videos = () => {
    if (selectedS3Videos.length === s3Videos.length) {
      setSelectedS3Videos([])
    } else {
      setSelectedS3Videos(s3Videos.map(v => v.key))
    }
  }

  // Format helpers
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${bytes} B`
  }

  const refreshAll = () => {
    fetchVideos()
    fetchS3Videos()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Video Library
          </h1>
          <p className="text-slate-600 mt-2">
            Manage and reuse uploaded videos across multiple courses
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={loading || loadingS3}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || loadingS3 ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/admin/courses/create')}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload New
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('mongodb')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'mongodb'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              MongoDB Library
              <Badge variant="secondary" className="ml-2">
                {stats.totalVideos}
              </Badge>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('s3')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 's3'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              S3 Storage
              <Badge variant="secondary" className="ml-2">
                {s3Videos.length}
              </Badge>
            </div>
          </button>
        </div>
      </div>

      {/* MongoDB Library */}
      {activeTab === 'mongodb' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Videos</p>
                    <p className="text-3xl font-bold text-blue-700 mt-2">{stats.totalVideos}</p>
                  </div>
                  <Video className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600 font-medium">Total Usage</p>
                    <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.totalUsage}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Storage Used</p>
                    <p className="text-3xl font-bold text-purple-700 mt-2">
                      {formatFileSize(stats.totalSize)}
                    </p>
                  </div>
                  <HardDrive className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600 font-medium">Avg Usage</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">
                      {stats.avgUsage.toFixed(1)}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search videos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedVideos.length > 0 && (
                    <>
                      <Badge variant="default" className="bg-blue-600">
                        {selectedVideos.length} selected
                      </Badge>
                      <Button variant="destructive" size="sm" onClick={deleteSelectedVideos}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-r-none border-0"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-l-none border-0"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Videos Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : videos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Database className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">No videos found</h3>
                <p className="text-slate-500 mb-4">Try uploading videos or importing from S3</p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => router.push('/admin/courses/create')}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Videos
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('s3')}>
                    <Import className="w-4 h-4 mr-2" />
                    Import from S3
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <Card key={video._id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 mb-4 group">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white/50 group-hover:text-white/70" />
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {video.formattedDuration}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedVideos.includes(video._id)}
                        onChange={() => toggleVideoSelection(video._id)}
                        className="absolute top-2 left-2 w-5 h-5 rounded border-slate-300 bg-white"
                      />
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                        {video.usageCount} uses
                      </Badge>
                    </div>
                    <h4 className="font-semibold line-clamp-2 mb-2">{video.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {video.description || video.video.originalFileName}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {video.formattedSize}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(video.uploadDate)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigator.clipboard.writeText(video.video.url)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy URL
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(video.video.url, '_blank')}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* S3 Storage */}
      {activeTab === 's3' && (
        <div className="space-y-6">
          {/* Import Progress */}
          {importing && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-amber-800">{importStatus}</span>
                    <span className="text-amber-600 font-medium">{importProgress}%</span>
                  </div>
                  <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* S3 Stats & Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600 font-medium">S3 Videos</p>
                    <p className="text-3xl font-bold text-amber-700 mt-2">{s3Videos.length}</p>
                  </div>
                  <Cloud className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Total Size</p>
                    <p className="text-3xl font-bold text-orange-700 mt-2">
                      {formatFileSize(s3Videos.reduce((sum, v) => sum + v.size, 0))}
                    </p>
                  </div>
                  <HardDrive className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-slate-600">
                      {selectedS3Videos.length} selected
                    </Badge>
                    <Button
                      size="sm"
                      onClick={selectAllS3Videos}
                      disabled={s3Videos.length === 0}
                    >
                      {selectedS3Videos.length === s3Videos.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-gradient-to-r from-amber-600 to-orange-600"
                    onClick={() => importS3Videos(selectedS3Videos)}
                    disabled={selectedS3Videos.length === 0 || importing}
                  >
                    <Import className="w-4 h-4 mr-2" />
                    Import Selected to MongoDB
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">S3 Storage Notice</p>
                <p className="text-sm text-amber-700 mt-1">
                  These are raw video files stored directly in S3. Import them to MongoDB to enable
                  search, categorization, usage tracking, and better management.
                </p>
              </div>
            </div>
          </div>

          {/* S3 Videos List */}
          {loadingS3 ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : s3Videos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Cloud className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold mb-2">No videos in S3</h3>
                <p className="text-slate-500 mb-4">Upload videos through the course creation page</p>
                <Button
                  onClick={() => router.push('/admin/courses/create')}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Videos
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {s3Videos.map((video) => (
                <Card
                  key={video.key}
                  className={`hover:shadow-md transition-shadow ${
                    selectedS3Videos.includes(video.key) ? 'ring-2 ring-amber-500' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={selectedS3Videos.includes(video.key)}
                        onChange={() => toggleS3VideoSelection(video.key)}
                        className="w-5 h-5 rounded border-slate-300"
                      />
                      <div className="w-16 h-16 rounded-lg bg-amber-900 flex items-center justify-center flex-shrink-0">
                        <Video className="w-8 h-8 text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold truncate">{video.fileName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {video.folder}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-500 truncate">{video.key}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {formatFileSize(video.size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(video.lastModified)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(video.url, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(video.url)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}