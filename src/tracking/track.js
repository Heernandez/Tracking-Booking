const { parseStringPromise } = require('xml2js');

function formatDate(dateString) {
    const date = new Date(dateString);

    const options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true // Para AM/PM
    };

    return date.toLocaleString('en-US', options).replace(',', '');
}

async function parseSoapResponseTracking(xml) {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const tables = result['soap:Envelope']['soap:Body']['getTrackingResponse']['getTrackingResult']['diffgr:diffgram']['NewDataSet']['Table'];
        // Verifica si hay tablas y procesa la información
        if (Array.isArray(tables)) {
            console.log("respuesta exitosa con informacion");
            return tables.map((table,index) => ({
                ID: tables.length - index,
                //SOURCE: table.SOURCE,
                //TYPE: table.TYPE,
                //CODE: table.CODE,
                DATEIN: formatDate(table.DATEIN), 
                //REFERENCE: table.REFERENCE,
                NOTE: table.NOTE,
                PIECES: table.PIECES,
                WEIGHT: table.WEIGHT,
                //USERID: table.USERID,
                //DATEINF: table.DATEINF,
            }));
        } else {
            console.log("respuesta exitosa sin informacion");
            return [];
        }
    } catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}

async function parseSoapResponseAwbno(xml) {
    try {
        console.log("parser 2");
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const tables = result['soap:Envelope']['soap:Body']['getFlightAwbResponse']['getFlightAwbResult']['diffgr:diffgram']['NewDataSet']['Table'];
        
        // Verifica si hay una tabla y si no es un array, la convierte en uno
        const tableArray = Array.isArray(tables) ? tables : [tables];
    
        // Verifica si hay tablas y procesa la información
        if (tableArray.length > 0) {
            console.log("respuesta exitosa con información");
            return tableArray.map((table, index) => ({
                ORIGIN: table.origin.trim(),
                DESTINATION: table.destination.trim(),
                PIECES: table.totpieces.trim(),
                WEIGHT: table.weight.trim(),
                VOLUME: table.volume.trim(),
                FLIGHT: table.flight.trim(),
            }));
        } else {
            console.log("respuesta exitosa sin información");
            return [];
        }
    } catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}

async function parseSoapResponseGetDestination(xml) {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const tables = result['soap:Envelope']['soap:Body']['getDestinationResponse']['getDestinationResult']['diffgr:diffgram']['NewDataSet']['Table'];
        // Verifica si hay tablas y procesa la información
        if (Array.isArray(tables)) {
            console.log("respuesta exitosa con informacion");
            return tables.map(table => ({
                ID: table.TEXT,
                VALUE: table.VALUE,
            }));
        } else {
            console.log("respuesta exitosa sin informacion");
            return [];
        }
    } catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}

async function parseSoapResponseGetRateClass(xml) {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const tables = result['soap:Envelope']['soap:Body']['getCommodityResponse']['getCommodityResult']['diffgr:diffgram']['NewDataSet']['Table'];
        // Verifica si hay tablas y procesa la información
        if (Array.isArray(tables)) {
            console.log("respuesta exitosa con informacion");
            return tables.map(table => ({
                ID: table.VALUE,
                VALUE: table.TEXT,
            }));
        } else {
            console.log("respuesta exitosa sin informacion");
            return [];
        }
    } catch (error) {
        console.error('Error parsing XML:', error);
        return [];
    }
}
module.exports = { 
    parseSoapResponseAwbno,
    parseSoapResponseTracking, 
    parseSoapResponseGetDestination ,
    parseSoapResponseGetRateClass
};
