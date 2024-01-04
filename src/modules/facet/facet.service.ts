import { Injectable } from '@nestjs/common';
import { compress, decompress } from 'compress-json';
import { InjectModel } from '@nestjs/sequelize';
import { FacetModel } from '../../models/facet.model';

@Injectable()
export class FacetService {
  constructor(@InjectModel(FacetModel) private _facetData: typeof FacetModel) {}

  async createFacet(data: any) {
    const facetData = JSON.stringify(compress(data.facetData));
    return this._facetData.upsert({
      ...data,
      facetData,
    });
  }

  async getFacet(id: string) {
    const res = await this._facetData.findByPk(id, {
      attributes: ['id', 'facetData'],
    });
    if (!res) return null;
    const decompressedData = decompress(JSON.parse(res.facetData));
    return {
      ...res.toJSON(),
      facetData: decompressedData,
    };
  }
}
