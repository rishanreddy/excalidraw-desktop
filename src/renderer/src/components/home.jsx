import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Grid,
  List,
  Settings,
  FolderOpen,
  FileText,
  Clock,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  Loader2,
  Copy,
  Edit3,
  MoreVertical,
  Type,
  Square,
  Minus,
  Upload
} from 'lucide-react'
import { toast } from 'sonner'

const DrawingLibraryPage = () => {
  const navigate = useNavigate()
  const [drawings, setDrawings] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [sortBy, setSortBy] = useState('recent')
  const [vaultPath, setVaultPath] = useState('')
  const [deleteModal, setDeleteModal] = useState({ show: false, drawing: null })
  const [renameModal, setRenameModal] = useState({ show: false, drawing: null, newName: '' })
  const [contextMenu, setContextMenu] = useState({ show: false, drawing: null, x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadDrawings = useCallback(async () => {
    try {
      setError(null)
      if (window.api?.listDrawings) {
        const loadedDrawings = await window.api.listDrawings()
        const processedDrawings = loadedDrawings.map((drawing) => ({
          ...drawing,
          id: drawing.name, // Use name as ID for consistency
          date: new Date(drawing.lastModified).toISOString(),
          size:
            drawing.size > 1024 * 1024
              ? `${(drawing.size / (1024 * 1024)).toFixed(2)} MB`
              : `${(drawing.size / 1024).toFixed(2)} KB`,
          displayName: drawing.name.replace('.excalidraw', '')
        }))
        setDrawings(processedDrawings)
      } else {
        // Fallback for development
        setDrawings([])
      }
    } catch (error) {
      console.error('Error loading drawings:', error)
      setError('Failed to load drawings. Please check your vault location.')
      setDrawings([])
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load vault path
      if (window.api?.store) {
        const savedVaultPath = await window.api.store.get('vaultPath')
        if (savedVaultPath) {
          setVaultPath(savedVaultPath)
        } else {
          setError('No vault location set. Please configure it in settings.')
          setLoading(false)
          return
        }
      }

      // Load drawings
      await loadDrawings()
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data. Please try refreshing.')
    } finally {
      setLoading(false)
    }
  }, [loadDrawings])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await loadDrawings()
      toast.success('Drawings refreshed')
    } catch (error) {
      toast.error('Failed to refresh drawings')
    } finally {
      setRefreshing(false)
    }
  }

  const createNewDrawing = () => {
    if (!vaultPath) {
      toast.error('Please set a vault location first')
      navigate('/settings')
      return
    }
    navigate('/editor')
  }

  const openDrawing = (fileName) => {
    if (!fileName) {
      toast.error('Invalid drawing file')
      return
    }
    navigate(`/editor?file=${encodeURIComponent(fileName)}`)
  }

  const openSettings = () => {
    navigate('/settings')
  }

  const openVaultInExplorer = async () => {
    if (window.api?.shell?.openPath && vaultPath) {
      try {
        await window.api.shell.openPath(vaultPath)
      } catch (error) {
        console.error('Error opening vault folder:', error)
        toast.error('Failed to open vault folder')
      }
    } else {
      // Fallback - copy path to clipboard
      navigator.clipboard.writeText(vaultPath)
      toast.success('Vault path copied to clipboard!')
    }
  }

  const handleDeleteClick = (drawing, event) => {
    event.stopPropagation()
    setDeleteModal({ show: true, drawing })
  }

  const confirmDelete = async () => {
    if (!deleteModal.drawing) return

    try {
      if (window.api?.deleteDrawing) {
        const success = await window.api.deleteDrawing(deleteModal.drawing.name)
        if (success) {
          setDrawings((prev) => prev.filter((d) => d.name !== deleteModal.drawing.name))
          toast.success('Drawing deleted successfully')
        } else {
          throw new Error('Delete operation failed')
        }
      } else {
        throw new Error('Delete functionality not available')
      }
    } catch (error) {
      console.error('Error deleting drawing:', error)
      toast.error('Failed to delete drawing')
    } finally {
      setDeleteModal({ show: false, drawing: null })
    }
  }

  const cancelDelete = () => {
    setDeleteModal({ show: false, drawing: null })
  }

  const handleContextMenu = (drawing, event) => {
    event.preventDefault()
    setContextMenu({
      show: true,
      drawing,
      x: event.clientX,
      y: event.clientY
    })
  }

  const closeContextMenu = () => {
    setContextMenu({ show: false, drawing: null, x: 0, y: 0 })
  }

  const handleRename = (drawing) => {
    setRenameModal({
      show: true,
      drawing,
      newName: drawing.displayName
    })
    closeContextMenu()
  }

  const confirmRename = async () => {
    if (!renameModal.drawing || !renameModal.newName.trim()) return

    try {
      if (window.api?.renameDrawing) {
        const result = await window.api.renameDrawing(
          renameModal.drawing.name,
          renameModal.newName.trim()
        )
        if (result.success) {
          await loadDrawings()
          toast.success('Drawing renamed successfully')
        } else {
          throw new Error(result.error || 'Rename operation failed')
        }
      } else {
        throw new Error('Rename functionality not available')
      }
    } catch (error) {
      console.error('Error renaming drawing:', error)
      toast.error('Failed to rename drawing: ' + error.message)
    } finally {
      setRenameModal({ show: false, drawing: null, newName: '' })
    }
  }

  const cancelRename = () => {
    setRenameModal({ show: false, drawing: null, newName: '' })
  }

  const handleDuplicate = async (drawing) => {
    try {
      if (window.api?.duplicateDrawing) {
        const result = await window.api.duplicateDrawing(drawing.name)
        if (result.success) {
          await loadDrawings()
          toast.success(`Drawing duplicated as "${result.newFileName}"`)
        } else {
          throw new Error(result.error || 'Duplicate operation failed')
        }
      } else {
        throw new Error('Duplicate functionality not available')
      }
    } catch (error) {
      console.error('Error duplicating drawing:', error)
      toast.error('Failed to duplicate drawing: ' + error.message)
    }
    closeContextMenu()
  }

  const renderThumbnail = (drawing) => {
    if (!drawing.thumbnail || drawing.thumbnail.elementCount === 0) {
      return <FileText className="w-8 h-8 text-text-secondary" />
    }

    const { hasText, hasShapes, hasLines, elementCount } = drawing.thumbnail

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="flex items-center space-x-1">
          {hasShapes && <Square className="w-4 h-4 text-blue-500" />}
          {hasLines && <Minus className="w-4 h-4 text-green-500" />}
          {hasText && <Type className="w-4 h-4 text-purple-500" />}
        </div>
        <div className="absolute bottom-1 right-1 text-xs text-text-secondary bg-bg-primary rounded px-1">
          {elementCount}
        </div>
      </div>
    )
  }

  const filteredDrawings = drawings
    .filter(
      (drawing) =>
        drawing.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drawing.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.displayName.localeCompare(b.displayName)
        case 'size':
          return b.size - a.size
        case 'recent':
        default:
          return new Date(b.date) - new Date(a.date)
      }
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">Loading your drawings...</h3>
          <p className="text-text-secondary">Please wait while we load your vault</p>
        </div>
      </div>
    )
  }

  if (error && !vaultPath) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-text-primary mb-2">Setup Required</h3>
          <p className="text-text-secondary mb-6">
            You need to set up a vault location before you can start creating drawings.
          </p>
          <button
            onClick={openSettings}
            className="bg-primary hover:bg-primary-darker text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="bg-bg-primary border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-text-primary">Excalidraw Desktop</h1>
            {vaultPath && (
              <button
                onClick={openVaultInExplorer}
                className="flex items-center space-x-2 text-text-secondary hover:text-primary transition-colors text-sm bg-bg-secondary hover:bg-bg-primary px-3 py-1.5 rounded-lg border border-border"
                title={`Open vault: ${vaultPath}`}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="truncate max-w-xs">{vaultPath.split('/').pop() || 'Vault'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={refreshData}
              disabled={refreshing}
              className="p-2 text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
              title="Refresh drawings"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={createNewDrawing}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-darker text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Drawing</span>
            </button>

            <button
              onClick={openSettings}
              className="p-2 text-text-secondary hover:text-primary transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && vaultPath && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
            <button
              onClick={refreshData}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="px-6 py-4 bg-bg-secondary border-b border-border">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary w-4 h-4" />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>

            {/* View Mode */}
            <div className="flex items-center bg-bg-primary border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-primary'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:text-primary'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-6" onClick={closeContextMenu}>
        {filteredDrawings.length === 0 ? (
          <div className="text-center py-16">
            {searchTerm ? (
              <div>
                <Search className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No drawings found</h3>
                <p className="text-text-secondary mb-4">
                  No drawings match "{searchTerm}". Try different search terms.
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-primary hover:text-primary-darker font-medium"
                >
                  Clear search
                </button>
              </div>
            ) : drawings.length === 0 ? (
              <div>
                <FileText className="w-16 h-16 text-text-secondary mx-auto mb-4" />
                <h3 className="text-xl font-medium text-text-primary mb-2">No drawings yet</h3>
                <p className="text-text-secondary mb-6">Create your first drawing to get started</p>
                <button
                  onClick={createNewDrawing}
                  className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-darker text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Drawing</span>
                </button>
              </div>
            ) : (
              <div>
                <FileText className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  All drawings filtered out
                </h3>
                <p className="text-text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-text-secondary">
                {filteredDrawings.length} of {drawings.length} drawing
                {drawings.length !== 1 ? 's' : ''}
                {searchTerm && ` matching "${searchTerm}"`}
              </p>
            </div>

            {/* Drawings Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDrawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="group bg-bg-primary rounded-xl border border-border p-4 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => openDrawing(drawing.name)}
                    onContextMenu={(e) => handleContextMenu(drawing, e)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-bg-secondary rounded-lg mb-3 flex items-center justify-center">
                      {renderThumbnail(drawing)}
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3
                          className="font-medium text-text-primary group-hover:text-primary transition-colors truncate flex-1"
                          title={drawing.displayName}
                        >
                          {drawing.displayName}
                        </h3>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleContextMenu(drawing, e)
                            }}
                            className="p-1 rounded transition-colors text-text-secondary hover:text-primary"
                            title="More options"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(drawing, e)}
                            className="p-1 rounded transition-colors text-text-secondary hover:text-red-500"
                            title="Delete drawing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm text-text-secondary">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(drawing.date).toLocaleDateString()}</span>
                        </div>
                        <span>{drawing.size}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDrawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="group bg-bg-primary rounded-lg border border-border p-4 hover:bg-secondary hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => openDrawing(drawing.name)}
                    onContextMenu={(e) => handleContextMenu(drawing, e)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                        {renderThumbnail(drawing)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-medium text-text-primary group-hover:text-primary transition-colors truncate"
                          title={drawing.displayName}
                        >
                          {drawing.displayName}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-text-secondary mt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(drawing.date).toLocaleDateString()}</span>
                          </div>
                          <span>{drawing.size}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleContextMenu(drawing, e)
                          }}
                          className="p-2 rounded transition-colors text-text-secondary hover:text-primary"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteClick(drawing, e)}
                          className="p-2 rounded transition-colors text-text-secondary hover:text-red-500"
                          title="Delete drawing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Context Menu */}
      {contextMenu.show && (
        <div
          className="fixed bg-primary-light border border-border rounded-lg shadow-lg py-2 z-50 min-w-32"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRename(contextMenu.drawing)}
            className="w-full px-3 py-2 text-left text-text-primary hover:bg-bg-secondary transition-colors flex items-center space-x-2 text-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>Rename</span>
          </button>
          <button
            onClick={() => handleDuplicate(contextMenu.drawing)}
            className="w-full px-3 py-2 text-left text-text-primary hover:bg-bg-secondary transition-colors flex items-center space-x-2 text-sm"
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate</span>
          </button>
          <hr className="my-1 border-border" />
          <button
            onClick={() => {
              handleDeleteClick(contextMenu.drawing, { stopPropagation: () => {} })
              closeContextMenu()
            }}
            className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center space-x-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl shadow-2xl border border-border w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Edit3 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Rename Drawing</h3>
                  <p className="text-text-secondary mb-4 text-sm">
                    Enter a new name for "{renameModal.drawing?.displayName}"
                  </p>

                  <input
                    type="text"
                    value={renameModal.newName}
                    onChange={(e) =>
                      setRenameModal((prev) => ({ ...prev, newName: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg text-text-primary bg-bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary mb-4"
                    placeholder="Drawing name"
                    autoFocus
                  />

                  <div className="flex space-x-3">
                    <button
                      onClick={confirmRename}
                      disabled={!renameModal.newName.trim()}
                      className="flex items-center justify-center space-x-2 flex-1 px-4 py-3 bg-primary hover:bg-primary-darker disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Rename</span>
                    </button>

                    <button
                      onClick={cancelRename}
                      className="flex-1 px-4 py-3 bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary rounded-lg font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-light rounded-2xl shadow-2xl border border-border w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Delete Drawing</h3>
                  <p className="text-text-secondary mb-6 leading-relaxed">
                    Are you sure you want to delete "
                    {deleteModal.drawing?.displayName || deleteModal.drawing?.name}"? This action
                    cannot be undone.
                  </p>

                  <div className="flex space-x-3">
                    <button
                      onClick={confirmDelete}
                      className="flex items-center justify-center space-x-2 flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>

                    <button
                      onClick={cancelDelete}
                      className="flex-1 px-4 py-3 bg-bg-secondary hover:bg-bg-primary border border-border text-text-primary rounded-lg font-medium transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawingLibraryPage
