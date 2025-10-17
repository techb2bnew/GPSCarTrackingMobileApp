/**
 * @format
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllAsyncStorageData } from '../src/utils/chipManager';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(),
  removeItem: jest.fn(),
}));

describe('clearAllAsyncStorageData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should clear all AsyncStorage keys successfully', async () => {
    // Mock data
    const mockKeys = ['user', 'active_chips', 'inactive_chips', 'parking_yards', 'yard_1_vehicles', 'chip_123'];
    
    AsyncStorage.getAllKeys.mockResolvedValue(mockKeys);
    AsyncStorage.removeItem.mockResolvedValue();

    const result = await clearAllAsyncStorageData();

    expect(AsyncStorage.getAllKeys).toHaveBeenCalledTimes(2); // Once to get keys, once to verify
    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(mockKeys.length);
    
    // Verify each key was removed
    mockKeys.forEach(key => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    expect(result.success).toBe(true);
    expect(result.clearedKeys).toBe(mockKeys.length);
    expect(result.totalKeys).toBe(mockKeys.length);
    expect(result.remainingKeys).toBe(0);
    expect(result.errors).toEqual([]);
  });

  test('should handle empty AsyncStorage', async () => {
    AsyncStorage.getAllKeys.mockResolvedValue([]);

    const result = await clearAllAsyncStorageData();

    expect(AsyncStorage.getAllKeys).toHaveBeenCalledTimes(2);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();

    expect(result.success).toBe(true);
    expect(result.clearedKeys).toBe(0);
    expect(result.totalKeys).toBe(0);
    expect(result.remainingKeys).toBe(0);
    expect(result.errors).toEqual([]);
  });

  test('should handle errors when removing individual keys', async () => {
    const mockKeys = ['user', 'active_chips', 'error_key'];
    
    AsyncStorage.getAllKeys
      .mockResolvedValueOnce(mockKeys) // First call to get keys
      .mockResolvedValueOnce(['error_key']); // Second call to verify (error_key remains)
    
    AsyncStorage.removeItem
      .mockResolvedValueOnce() // user - success
      .mockResolvedValueOnce() // active_chips - success
      .mockRejectedValueOnce(new Error('Failed to remove key')); // error_key - fails

    const result = await clearAllAsyncStorageData();

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
    expect(result.clearedKeys).toBe(2);
    expect(result.totalKeys).toBe(3);
    expect(result.remainingKeys).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].key).toBe('error_key');
  });

  test('should handle critical error when getting keys', async () => {
    AsyncStorage.getAllKeys.mockRejectedValue(new Error('Critical AsyncStorage error'));

    const result = await clearAllAsyncStorageData();

    expect(result.success).toBe(false);
    expect(result.clearedKeys).toBe(0);
    expect(result.totalKeys).toBe(0);
    expect(result.remainingKeys).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].key).toBe('CRITICAL_ERROR');
  });
});
