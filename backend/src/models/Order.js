import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Order = sequelize.define("Order", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },

    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    barber_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },

    area_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    service_details: {
        type: DataTypes.TEXT,
        allowNull: false,
    },

    status: {
        type: DataTypes.ENUM(
            "PENDING",
            "ACCEPTED",
            "COMPLETED",
            "CANCELED"
        ),
        allowNull: false,
        defaultValue: "PENDING",
    },
}, {
    tableName: "orders",
    timestamps: true,
});

export default Order;