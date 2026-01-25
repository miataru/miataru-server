known_markers = [];
//marker_mapping = {};
marker_names = [];
popups = [];

function htmlEncode(value){  
     //create a in-memory div, set it's inner text(which jQuery automatically encodes)   //then grab the encoded contents back out.  The div never exists on the page.   
    return $('<div/>').text(value).html(); 
}  
function htmlDecode(value){   
return $('<div/>').html(value).text(); 
}

// look if we got a hash parameter passed
if (window.location.hash != "")
{
    var Data = window.location.hash.slice( 1 ).split(";");
    var arrayLength = Data.length;

    if ( arrayLength % 2 === 0 )
    {
        for (var i = 0; i < arrayLength; i+=2) {
            //console.log("User passed a device: " + htmlEncode( decodeURIComponent( Data[i] ) ));
            //console.log("User named a device:" + htmlEncode( decodeURIComponent( Data[i+1] ) ) );
            
            var Device = {};
            Device.Name = htmlEncode( decodeURIComponent( Data[i+1] ) );
            Device.ID = htmlEncode( decodeURIComponent( Data[i] ) ) ;
    
            known_markers.push(L.realtime({
                url: 'https://service.miataru.com/v1/GetLocationGeoJSON/'+htmlEncode( decodeURIComponent( Data[i] ) ),
                crossOrigin: true,
                type: 'json'
            }, {
                interval: 3 * 1000
            }));

    
            popups.push(L.popup().setContent(Device.Name));
            
            // bind
            known_markers[known_markers.length-1].bindPopup(popups[popups.length-1]);
            
            //marker_mapping[Device.ID] = Device.Name;
            marker_names.push(Device.Name);
        }
    }
}

var map = L.map('map');

for (var i = 0; i < known_markers.length; i++) 
{
    known_markers[i].addTo(map);
    //known_markers[i].bindPopup(marker_names[i]);
    
    // gets called when an update happens, e include
    known_markers[i].on('update', function(e)
    {
        //console.log(marker_names[e.features.undefined.properties.name]);

        for (var x = 0; x < known_markers.length; x++)
        {
            known_markers[x].bindPopup(L.popup().setContent(marker_names[x]));//.openPopup();
        }        
        var group = new L.featureGroup(known_markers);
        map.fitBounds(group.getBounds(), {
            padding: [50, 50],
            maxZoom: 15
        });
        
        known_markers[known_markers.length-1].openPopup();
        
    });
}


L.tileLayer('http://{s}.maps.miataru.com/osm/{z}/{x}/{y}.png', {
	//L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	//L.tileLayer('http://{s}.tile.cloudmade.com/1007c879cfc0485486e05b94ee5dc15c/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
        detectRetina: true,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> location service <a href="http://miataru.com">miataru.com</a>'
		}).addTo(map);

