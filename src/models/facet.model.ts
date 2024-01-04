import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'facet' })
export class FacetModel extends Model<FacetModel> {
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    unique: true,
    allowNull: false,
  })
  id: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  facetData: string;
}
