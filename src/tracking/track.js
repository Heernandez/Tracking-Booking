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
    parseSoapResponseTracking, 
    parseSoapResponseGetDestination ,
    parseSoapResponseGetRateClass
};
