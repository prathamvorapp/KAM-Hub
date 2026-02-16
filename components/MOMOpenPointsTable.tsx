'use client'

import { useState } from 'react';
import { CheckCircle, Clock, User, Building } from 'lucide-react';

interface OpenPoint {
  topic: string;
  description: string;
  ownership: string;
  owner_name: string;
  status: string;
  timeline: string;
  created_at: string;
  updated_at: string;
}

interface MOMOpenPointsTableProps {
  openPoints: OpenPoint[];
  title?: string;
}

export default function MOMOpenPointsTable({ openPoints, title = "Open Points" }: MOMOpenPointsTableProps) {
  if (!openPoints || openPoints.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No open points recorded for this MOM.
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    return status === 'Closed' ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <Clock className="w-4 h-4 text-orange-600" />
    );
  };

  const getOwnershipIcon = (ownership: string) => {
    return ownership === 'Brand' ? (
      <Building className="w-4 h-4 text-blue-600" />
    ) : (
      <User className="w-4 h-4 text-purple-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'Closed' ? (
      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
        Closed
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
        Open
      </span>
    );
  };

  const getOwnershipBadge = (ownership: string) => {
    return ownership === 'Brand' ? (
      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
        Brand
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
        Me
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">
          {openPoints.length} point{openPoints.length !== 1 ? 's' : ''} recorded
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Topic
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ownership
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Timeline
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {openPoints.map((point, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {point.topic}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs">
                    {point.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getOwnershipIcon(point.ownership)}
                    {getOwnershipBadge(point.ownership)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {point.owner_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(point.status)}
                    {getStatusBadge(point.status)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {point.timeline ? new Date(point.timeline).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}