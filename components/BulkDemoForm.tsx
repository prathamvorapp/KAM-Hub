"use client";

import React, { useState } from "react";

interface BulkDemoFormProps {
  demo: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  products: readonly string[];
  demoConductors: readonly string[];
}

export default function BulkDemoForm({ 
  demo, 
  onSubmit, 
  onCancel, 
  products,
  demoConductors 
}: BulkDemoFormProps) {
  const [formData, setFormData] = useState({
    isApplicable: true,
    nonApplicableReason: "",
    usageStatus: "Demo Pending",
    scheduledDate: "",
    scheduledTime: "",
    conductedBy: "",
    completionNotes: "",
    conversionStatus: "Converted",
    nonConversionReason: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.isApplicable && !formData.nonApplicableReason.trim()) {
      alert("Please provide a reason for non-applicability");
      return;
    }

    if (formData.isApplicable && formData.usageStatus === "Demo Pending") {
      if (!formData.scheduledDate || !formData.scheduledTime) {
        alert("Please provide demo date and time");
        return;
      }
      if (!formData.conductedBy) {
        alert("Please select who conducted the demo");
        return;
      }
      if (formData.conversionStatus === "Not Converted" && !formData.nonConversionReason.trim()) {
        alert("Please provide a reason for non-conversion");
        return;
      }
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            Complete Demo Workflow - {demo.product_name}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Step 1: Applicability */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm mr-2">1</span>
              Product Applicability
            </h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isApplicable"
                    checked={formData.isApplicable}
                    onChange={() => setFormData({ ...formData, isApplicable: true })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">✅ Applicable</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="isApplicable"
                    checked={!formData.isApplicable}
                    onChange={() => setFormData({ ...formData, isApplicable: false })}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium text-gray-700">❌ Not Applicable</span>
                </label>
              </div>
              {!formData.isApplicable && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Non-Applicability *
                  </label>
                  <textarea
                    value={formData.nonApplicableReason}
                    onChange={(e) => setFormData({ ...formData, nonApplicableReason: e.target.value })}
                    placeholder="Why is this product not applicable?"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required={!formData.isApplicable}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Usage Status (only if applicable) */}
          {formData.isApplicable && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm mr-2">2</span>
                Usage Status
              </h4>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="usageStatus"
                    value="Demo Pending"
                    checked={formData.usageStatus === "Demo Pending"}
                    onChange={(e) => setFormData({ ...formData, usageStatus: e.target.value })}
                    className="w-4 h-4 text-green-600"
                  />
                  <span className="text-sm font-medium text-gray-700">🟡 Demo Pending</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="usageStatus"
                    value="Already Using"
                    checked={formData.usageStatus === "Already Using"}
                    onChange={(e) => setFormData({ ...formData, usageStatus: e.target.value })}
                    className="w-4 h-4 text-teal-600"
                  />
                  <span className="text-sm font-medium text-gray-700">🟢 Already Using</span>
                </label>
              </div>
            </div>
          )}

          {/* Steps 3, 4, 5 (only if Demo Pending) */}
          {formData.isApplicable && formData.usageStatus === "Demo Pending" && (
            <>
              {/* Step 3: Schedule */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm mr-2">3</span>
                  Schedule Demo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo Date *</label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Demo Time *</label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Step 4: Complete Demo */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm mr-2">4</span>
                  Demo Completion
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Who Conducted the Demo? *</label>
                    <select
                      value={formData.conductedBy}
                      onChange={(e) => setFormData({ ...formData, conductedBy: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select conductor</option>
                      {demoConductors.map(conductor => (
                        <option key={conductor} value={conductor}>{conductor}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Completion Notes (Optional)</label>
                    <textarea
                      value={formData.completionNotes}
                      onChange={(e) => setFormData({ ...formData, completionNotes: e.target.value })}
                      placeholder="Any notes about the demo..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Conversion */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h4 className="font-semibold text-orange-900 mb-3 flex items-center">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm mr-2">5</span>
                  Conversion Decision
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversionStatus"
                        value="Converted"
                        checked={formData.conversionStatus === "Converted"}
                        onChange={(e) => setFormData({ ...formData, conversionStatus: e.target.value })}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-sm font-medium text-gray-700">✅ Converted</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="conversionStatus"
                        value="Not Converted"
                        checked={formData.conversionStatus === "Not Converted"}
                        onChange={(e) => setFormData({ ...formData, conversionStatus: e.target.value })}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="text-sm font-medium text-gray-700">❌ Not Converted</span>
                    </label>
                  </div>
                  {formData.conversionStatus === "Not Converted" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for Non-Conversion *
                      </label>
                      <textarea
                        value={formData.nonConversionReason}
                        onChange={(e) => setFormData({ ...formData, nonConversionReason: e.target.value })}
                        placeholder="Why was the demo not converted?"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        required={formData.conversionStatus === "Not Converted"}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete Workflow</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
