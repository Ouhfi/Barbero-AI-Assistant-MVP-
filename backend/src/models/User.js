import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Area from "./Area.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },

    fullName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("CUSTOMER", "BARBER"),
      allowNull: false,
      defaultValue: "CUSTOMER",
    },

    area_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: false,
  }
);

User.belongsTo(Area, {
  foreignKey: "area_id",
});

export default User;