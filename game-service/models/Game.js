const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GameCategory = sequelize.define('GameCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const Game = sequelize.define('Game', {
  name: { type: DataTypes.STRING, allowNull: false },
  categoryId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: GameCategory,
      key: 'id'
    }
  },
  price: { type: DataTypes.FLOAT, allowNull: false },
  originalPrice: DataTypes.FLOAT,
  image: DataTypes.STRING,
  filters: { type: DataTypes.JSON, defaultValue: [] }
});

Game.belongsTo(GameCategory, { foreignKey: 'categoryId', as: 'category' });
GameCategory.hasMany(Game, { foreignKey: 'categoryId', as: 'games' });

module.exports = { Game, GameCategory };
