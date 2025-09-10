import { apiService } from './api';

export interface ConfigModule {
  name: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  enabled: boolean;
  status: 'available' | 'missing';
  last_modified: string | null;
  file_size: number;
}

export interface ConfigCategory {
  name: string;
  count: number;
  modules: string[];
}

export interface ModuleConfigData {
  module: ConfigModule;
  config: any;
  schema: any;
  status: 'valid' | 'missing';
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  config?: any;
  errors?: string;
}

export interface BackupInfo {
  filename: string;
  timestamp: string;
  size: number;
  created_at: string;
}

export interface SystemStatus {
  total_modules: number;
  available_modules: number;
  missing_modules: number;
  total_size: string;
  backup_count: number;
  config_directory: string;
  backup_directory: string;
  last_check: string;
}

export interface ServiceProvider {
  value: string;
  label: string;
  description: string;
}

export class ConfigCenterService {
  // 获取所有配置模块
  async getConfigModules(): Promise<ConfigModule[]> {
    return apiService.get('/api/config-center/modules');
  }

  // 获取配置分类
  async getConfigCategories(): Promise<ConfigCategory[]> {
    return apiService.get('/api/config-center/categories');
  }

  // 获取指定模块的配置
  async getModuleConfig(moduleName: string): Promise<ModuleConfigData> {
    return apiService.get(`/api/config-center/modules/${moduleName}`);
  }

  // 更新指定模块的配置
  async updateModuleConfig(moduleName: string, configData: any): Promise<any> {
    return apiService.put(`/api/config-center/modules/${moduleName}`, configData);
  }

  // 验证模块配置
  async validateModuleConfig(moduleName: string, configData: any): Promise<ValidationResult> {
    return apiService.post(`/api/config-center/modules/${moduleName}/validate`, configData);
  }

  // 重置模块配置
  async resetModuleConfig(moduleName: string): Promise<any> {
    return apiService.post(`/api/config-center/modules/${moduleName}/reset`);
  }

  // 获取模块备份列表
  async getModuleBackups(moduleName: string): Promise<BackupInfo[]> {
    return apiService.get(`/api/config-center/modules/${moduleName}/backups`);
  }

  // 恢复配置备份
  async restoreConfigBackup(moduleName: string, backupFilename: string): Promise<any> {
    return apiService.post(`/api/config-center/modules/${moduleName}/restore`, {
      backup_filename: backupFilename
    });
  }

  // 导出所有配置
  async exportAllConfigs(): Promise<any> {
    return apiService.get('/api/config-center/export');
  }

  // 导入所有配置
  async importAllConfigs(configsData: any): Promise<any> {
    return apiService.post('/api/config-center/import', { configs: configsData });
  }

  // 获取系统状态
  async getSystemStatus(): Promise<SystemStatus> {
    return apiService.get('/api/config-center/status');
  }

  // 获取服务提供商列表
  async getServiceProviders(serviceType: string): Promise<ServiceProvider[]> {
    return apiService.get(`/api/config-center/providers/${serviceType}`);
  }

  // 获取提供商音色列表
  async getProviderVoices(provider: string): Promise<ServiceProvider[]> {
    return apiService.get(`/api/config-center/voices/${provider}`);
  }

  // 获取提供商模型列表
  async getProviderModels(provider: string, serviceType: string = 'llm'): Promise<ServiceProvider[]> {
    return apiService.get(`/api/config-center/models/${provider}?service_type=${serviceType}`);
  }
}

export const configCenterService = new ConfigCenterService();
