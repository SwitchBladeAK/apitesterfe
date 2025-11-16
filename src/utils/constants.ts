/**
 * Constants
 * Follows DRY principle - centralized constants
 */

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const METHOD_COLORS = {
  GET: 'bg-green-100 text-green-800 border-green-300',
  POST: 'bg-blue-100 text-blue-800 border-blue-300',
  PUT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  PATCH: 'bg-orange-100 text-orange-800 border-orange-300',
  DELETE: 'bg-red-100 text-red-800 border-red-300',
};

export const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  pending: 'bg-gray-100 text-gray-800',
};

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

