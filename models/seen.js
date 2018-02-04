module.exports = (sequelize, DataTypes) => {
    const Seen = sequelize.define('seen', {
        seenId: DataTypes.STRING,
        seenName: DataTypes.STRING,
        seenLocation: DataTypes.STRING,
        rekognitionData: DataTypes.JSON
    });
    return Seen;
};