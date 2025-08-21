function init() {
    var map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    fetch('/api/devices').then(function(resp){ return resp.json(); }).then(function(data){
        if(!data.devices) return;
        data.devices.forEach(function(dev){
            if(!dev.last) return;
            var lat = parseFloat(dev.last.Latitude);
            var lon = parseFloat(dev.last.Longitude);
            if(isNaN(lat) || isNaN(lon)) return;
            var marker = L.marker([lat, lon]).addTo(map).bindPopup('Device: ' + dev.device);

            // load history for polyline
            fetch('/v1/GetLocationHistory', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({MiataruGetLocationHistory:{Device: dev.device, Amount: 10}})
            }).then(function(r){ return r.json(); }).then(function(hist){
                if(hist.MiataruLocation){
                    var latlngs = hist.MiataruLocation.map(function(l){
                        return [parseFloat(l.Latitude), parseFloat(l.Longitude)];
                    });
                    if(latlngs.length > 1){
                        L.polyline(latlngs, {color: 'blue'}).addTo(map);
                    }
                }
            });
        });
    });
}

if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
