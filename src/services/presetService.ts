import type { Preset, CreatePresetDTO, UpdatePresetDTO } from '../commons/types';
import { CRUDService } from './crudService';

class PresetService extends CRUDService<Preset, CreatePresetDTO, UpdatePresetDTO> {
  constructor() {
    super('/presets');
  }
}

export const presetService = new PresetService();
