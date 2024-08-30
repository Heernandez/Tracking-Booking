const { parseStringPromise } = require('xml2js');

async function parseSoapResponse(xml) {
    try {
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });
        const tables = result['soap:Envelope']['soap:Body']['getTrackingResponse']['getTrackingResult']['diffgr:diffgram']['NewDataSet']['Table'];
        // Verifica si hay tablas y procesa la información
        if (Array.isArray(tables)) {
            console.log("respuesta exitosa con informacion");
            return tables.map(table => ({
                ID: table.ID,
                SOURCE: table.SOURCE,
                TYPE: table.TYPE,
                CODE: table.CODE,
                DATEIN: table.DATEIN,
                REFERENCE: table.REFERENCE,
                PIECES: table.PIECES,
                WEIGHT: table.WEIGHT,
                NOTE: table.NOTE,
                USERID: table.USERID,
                DATEINF: table.DATEINF,
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

module.exports = { parseSoapResponse };
