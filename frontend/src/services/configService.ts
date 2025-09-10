import { apiService } from './api';
import { ConfigFile, ConfigData, ConfigStatistics } from '@/types';

export class ConfigService {
  // 获取所有配置文件
  async getConfigs(): Promise<ConfigFile[]> {
    return apiService.get('/api/configs');
  }

  // 别名方法，保持兼容性
  async getConfigFiles(): Promise<ConfigFile[]> {
    return this.getConfigs();
  }

  // 获取配置文件内容
  async getConfigData(filename: string): Promise<ConfigData> {
    return apiService.get(`/api/configs/${filename}`);
  }

  // 保存配置文件
  async saveConfig(filename: string, data: any): Promise<void> {
    return apiService.post(`/api/configs/${filename}`, { data });
  }

  // 创建新配置文件
  async createConfig(filename: string, data: any): Promise<void> {
    return apiService.post('/api/configs', { filename, data });
  }

  // 删除配置文件
  async deleteConfig(filename: string): Promise<void> {
    return apiService.delete(`/api/configs/${filename}`);
  }

  // 验证YAML内容
  async validateConfig(filename: string, content: string): Promise<{ valid: boolean; error?: string }> {
    return apiService.post(`/api/configs/${filename}/validate`, { content });
  }

  // 备份配置文件
  async backupConfig(filename: string): Promise<void> {
    return apiService.post(`/api/configs/${filename}/backup`);
  }

  // 获取备份列表
  async getBackups(filename: string): Promise<any[]> {
    const result = await apiService.get(`/api/configs/${filename}/backups`);
    return result.backups || [];
  }

  // 恢复配置文件
  async restoreConfig(filename: string, backupFilename: string): Promise<void> {
    return apiService.post(`/api/configs/${filename}/restore`, { backup_filename: backupFilename });
  }

  // 下载配置文件
  async downloadConfig(filename: string): Promise<void> {
    return apiService.download(`/api/configs/${filename}/download`, filename);
  }

  // 搜索配置文件
  async searchConfigs(query: string): Promise<ConfigFile[]> {
    const result = await apiService.get(`/api/configs/search/${encodeURIComponent(query)}`);
    return result.results || [];
  }

  // 获取配置统计信息
  async getConfigStatistics(): Promise<ConfigStatistics> {
    return apiService.get('/api/configs/statistics/overview');
  }

  // 上传配置文件
  async uploadConfig(file: File, onProgress?: (progress: number) => void): Promise<void> {
    return apiService.upload('/api/configs/upload', file, onProgress);
  }

  // ===== 配置中心管理方法 =====
  // 获取配置模块列表
  async getConfigModules(): Promise<any[]> {
    return apiService.get('/api/config-center/modules');
  }

  // 获取配置分类
  async getConfigCategories(): Promise<any[]> {
    return apiService.get('/api/config-center/categories');
  }

  // 获取指定模块配置
  async getModuleConfig(moduleName: string): Promise<any> {
    return apiService.get(`/api/config-center/modules/${moduleName}`);
  }

  // 更新指定模块配置
  async updateModuleConfig(moduleName: string, configData: any): Promise<any> {
    return apiService.put(`/api/config-center/modules/${moduleName}`, configData);
  }

  // 验证模块配置
  async validateModuleConfig(moduleName: string, configData: any): Promise<any> {
    return apiService.post(`/api/config-center/modules/${moduleName}/validate`, configData);
  }

  // 重置模块配置
  async resetModuleConfig(moduleName: string): Promise<any> {
    return apiService.post(`/api/config-center/modules/${moduleName}/reset`);
  }

  // 导出所有配置
  async exportAllConfigs(): Promise<any> {
    return apiService.get('/api/config-center/export');
  }

  // 导入所有配置
  async importAllConfigs(configData: any): Promise<any> {
    return apiService.post('/api/config-center/import', configData);
  }

  // 获取系统状态
  async getSystemStatus(): Promise<any> {
    return apiService.get('/api/config-center/status');
  }
}

export const configService = new ConfigService();
