'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, AlertCircle, CheckCircle, Download, Eye } from 'lucide-react'

interface ChurnCSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

interface ValidationResult {
  valid: any[]
  invalid: any[]
  duplicates: any[]
}

interface UploadSummary {
  total_rows_in_file: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows_in_file: number
  existing_records_skipped: number
  new_records_imported: number
  import_failures: number
}

interface UploadResponse {
  success: boolean
  message: string
  summary: UploadSummary
  details: {
    uploaded_by: string
    uploaded_at: string
    filename: string
    existing_rids: string[]
    import_errors: any[]
  }
  validation_results?: ValidationResult
}

const CSV_TEMPLATE_HEADERS = [
  'Date',
  'RID', 
  'Restaurant Name',
  'Brand Name',
  'Owner Email ID',
  'KAM'
]

const SAMPLE_CSV_DATA = [
  ['30-01-2026', '147190', 'Kunafa Bytes (Indore)', 'Kunafa Bytes', 'sales@kunafabytes.com', 'Erna Mahima'],
  ['30-01-2026', '119522', 'Daughters Bor Dwaraka', 'Daughters Bor', 'info@daughtersbor.com', 'Jitwin Purohit'],
  ['30-01-2026', '354609', 'Lords (Dhule)', 'Lords Restaurant', 'contact@lords.com', 'Mahima Sali']
]

export default function ChurnCSVUploadModal({
  isOpen,
  onClose,
  onUploadComplete
}: ChurnCSVUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadResult(null)
      setShowPreview(false)
      setPreviewData([])
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type === 'text/csv') {
      setSelectedFile(file)
      setUploadResult(null)
      setShowPreview(false)
      setPreviewData([])
    }
  }

  const previewCSV = async () => {
    if (!selectedFile) return

    const text = await selectedFile.text()
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim()) // Trim headers
    const rows = lines.slice(1, 6).map(line => 
      line.split(',').map(cell => cell.trim()) // Trim all cell values
    ) // Show first 5 rows

    setPreviewData([headers, ...rows])
    setShowPreview(true)
  }

  const uploadCSV = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('csvFile', selectedFile)

      const response = await fetch(`/api/churn-upload/upload-csv`, {
        method: 'POST',
        credentials: 'include', // Include cookies for session
        body: formData
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Server returned HTML (likely an error page)
        const htmlText = await response.text();
        console.error('Server returned HTML instead of JSON:', htmlText);
        throw new Error(`Server error (${response.status}): Expected JSON response but got HTML. This usually indicates a server-side error.`);
      }

      const result = await response.json()
      
      // Handle non-200 responses with proper JSON error structure
      if (!response.ok) {
        // If it's a validation error, show the validation results
        if (result.validation_results) {
          setUploadResult({
            success: false,
            message: result.error || result.detail || `HTTP ${response.status}: ${response.statusText}`,
            summary: result.summary || {
              total_rows_in_file: 0,
              valid_rows: 0,
              invalid_rows: 0,
              duplicate_rows_in_file: 0,
              existing_records_skipped: 0,
              new_records_imported: 0,
              import_failures: 0
            },
            details: {
              uploaded_by: '',
              uploaded_at: '',
              filename: '',
              existing_rids: [],
              import_errors: []
            },
            validation_results: result.validation_results
          });
          return;
        }
        
        throw new Error(result.error || result.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      setUploadResult(result)

      if (result.success) {
        onUploadComplete()
      }
    } catch (error) {
      console.error('CSV upload error:', error);
      setUploadResult({
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed: ' + String(error),
        summary: {
          total_rows_in_file: 0,
          valid_rows: 0,
          invalid_rows: 0,
          duplicate_rows_in_file: 0,
          existing_records_skipped: 0,
          new_records_imported: 0,
          import_failures: 0
        },
        details: {
          uploaded_by: '',
          uploaded_at: '',
          filename: '',
          existing_rids: [],
          import_errors: []
        }
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = [
      CSV_TEMPLATE_HEADERS.join(','),
      ...SAMPLE_CSV_DATA.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'churn_data_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const resetModal = () => {
    setSelectedFile(null)
    setUploadResult(null)
    setShowPreview(false)
    setPreviewData([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto modal-content">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Upload Churn Data CSV
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Instructions */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Required columns: {CSV_TEMPLATE_HEADERS.join(', ')}</li>
              <li>• Date format: DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY (e.g., 30-01-2026, 30/01/2026, 30.01.2026)</li>
              <li>• RID must be unique within the file</li>
              <li>• Owner Email ID must be a valid email address</li>
              <li>• Maximum file size: 10MB</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-1" />
              Download Template
            </button>
          </div>

          {/* File Upload Area */}
          {!uploadResult && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop your CSV file here, or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Only CSV files are accepted
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Select File
              </button>
            </div>
          )}

          {/* Selected File Info */}
          {selectedFile && !uploadResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-500 mr-2" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={previewCSV}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </button>
                  <button
                    onClick={uploadCSV}
                    disabled={isUploading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CSV Preview */}
          {showPreview && previewData.length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">CSV Preview (First 5 rows):</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      {previewData[0].map((header: string, index: number) => (
                        <th key={index} className="px-3 py-2 text-left font-medium text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(1).map((row: string[], rowIndex: number) => (
                      <tr key={rowIndex} className="border-t">
                        {row.map((cell: string, cellIndex: number) => (
                          <td key={cellIndex} className="px-3 py-2 text-gray-600">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-4">
              {uploadResult.success ? (
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <h4 className="font-medium text-green-900">Upload Successful!</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.summary.total_rows_in_file}
                      </div>
                      <div className="text-sm text-gray-600">Total Rows</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadResult.summary.new_records_imported}
                      </div>
                      <div className="text-sm text-gray-600">Imported</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {uploadResult.summary.existing_records_skipped}
                      </div>
                      <div className="text-sm text-gray-600">Skipped</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {uploadResult.summary.import_failures}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p><strong>File:</strong> {uploadResult.details.filename}</p>
                    <p><strong>Uploaded by:</strong> {uploadResult.details.uploaded_by}</p>
                    <p><strong>Upload time:</strong> {new Date(uploadResult.details.uploaded_at).toLocaleString()}</p>
                  </div>

                  {uploadResult.details.existing_rids.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded">
                      <p className="text-sm font-medium text-yellow-800">
                        Skipped RIDs (already exist): {uploadResult.details.existing_rids.slice(0, 5).join(', ')}
                        {uploadResult.details.existing_rids.length > 5 && ` and ${uploadResult.details.existing_rids.length - 5} more...`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                    <h4 className="font-medium text-red-900">Upload Failed</h4>
                  </div>
                  
                  <p className="text-red-800 mb-3">{uploadResult.message}</p>

                  {uploadResult.validation_results && (
                    <div className="space-y-3">
                      {uploadResult.validation_results.invalid.length > 0 && (
                        <div className="p-3 bg-red-100 rounded">
                          <h5 className="font-medium text-red-900 mb-2">
                            Invalid Rows ({uploadResult.validation_results.invalid.length}):
                          </h5>
                          <div className="max-h-32 overflow-y-auto">
                            {uploadResult.validation_results.invalid.slice(0, 5).map((error: any, index: number) => (
                              <div key={index} className="text-sm text-red-800">
                                Row {error.row}: {Array.isArray(error.error) ? error.error.map((e: any) => e.message).join(', ') : error.error}
                              </div>
                            ))}
                            {uploadResult.validation_results.invalid.length > 5 && (
                              <div className="text-sm text-red-700 mt-1">
                                ... and {uploadResult.validation_results.invalid.length - 5} more errors
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {uploadResult.validation_results.duplicates.length > 0 && (
                        <div className="p-3 bg-yellow-100 rounded">
                          <h5 className="font-medium text-yellow-900 mb-2">
                            Duplicate RIDs in File ({uploadResult.validation_results.duplicates.length}):
                          </h5>
                          <div className="text-sm text-yellow-800">
                            {uploadResult.validation_results.duplicates.slice(0, 5).map((dup: any, index: number) => (
                              <div key={index}>Row {dup.row}: RID {dup.rid}</div>
                            ))}
                            {uploadResult.validation_results.duplicates.length > 5 && (
                              <div className="mt-1">... and {uploadResult.validation_results.duplicates.length - 5} more duplicates</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={resetModal}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Upload Another File
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}