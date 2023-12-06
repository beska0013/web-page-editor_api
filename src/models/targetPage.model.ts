import { Column, DataType, Table, Model } from 'sequelize-typescript';

@Table({ tableName: 'targetPage' })
export class TargetPageModel extends Model<TargetPageModel> {
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  projectHash: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  projectData: string;

  @Column({ type: DataType.STRING, allowNull: false })
  projectTarget: string;

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  projectFonts: string[];

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  projectClasses: string[];
}
