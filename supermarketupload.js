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
  let i = 0
  let temp = 0
  var date_ob = new Date();

  var day = date_ob.getDate();

  var month = date_ob.getMonth() + 1;

  today = [date_ob.getFullYear() + '-',(month>9 ? '' : '0') + month + '-',(day>9 ? '' : '0') + day].join('');

  data.forEach(element => {
    // console.log(element)

    i = Math.floor(Math.random() * 2)
    if (i % 2 == 0){
      temp = new SupermarketM({
        type:element.type,
        properties: {id:(element.id.slice(5)),name:element.properties.name},
        offers: [{id: (element.id.slice(5)),username:"a",product: "Pampers Prem Care No4 8-14κιλ 34τεμ",price: Math.round(Math.random() * 50) / 10,date: today,likes: 100, dislikes: 0,available: true, reqDay: true, reqWeek: true}],
        geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
      });
    }
    else {
      temp = new SupermarketM({
        type:element.type,
        properties: {id:(element.id.slice(5)),name:element.properties.name},
        offers: [],
        geometry: {type:element.geometry.type, coordinates:element.geometry.coordinates}
      });
    }

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

