
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Area = sequelize.define(
  "Area",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "areas",
    timestamps: false,
  }
);

export default Area;

