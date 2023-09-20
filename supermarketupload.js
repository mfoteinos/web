const fs = require('fs');
const mongoose = require('mongoose');
const SupermarketM = require('./models/supermarket');

const db_url = 'mongodb+srv://xrhsthsthsvashs:ZJgAlDrKedPXkUUZ@cluster0.eixd381.mongodb.net/Data?retryWrites=true&w=majority';
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true} )
.then((result) => console.log('connected to database'))
.catch((err) => console.log(err))


fs.readFile('export.geojson', 'utf8', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }



  data = JSON.parse(data);
  data = data.features.filter(feature => feature.properties.name != null && feature.properties.name != "No supermarket");
  data = data.filter(feature => feature.geometry.type != undefined && feature.geometry.type != "Polygon" );
  let tempArray = [];


  data.forEach(element => {
    // console.log(element)

    
      temp = new SupermarketM({
        type:element.type,
        properties: {id:(element.id.slice(5)),name:element.properties.name},
        offers: [],
        geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
      });

    tempArray.push(temp)
  });
  
SupermarketM.collection.insertMany(tempArray, (err) => {

    if(err)
    {
      return console.error(err);
    }
    else {
      console.info('supermarkets were successfully stored.');
  }
  })

  console.log('test');
  // allSupermarkets = JSON.stringify(data);
});

