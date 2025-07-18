// =================================================================
// PVA PRODUCCIÓN - BACKEND SCRIPT (code.gs) - VERSIÓN MEJORADA
// =================================================================

// ¡IMPORTANTE! Reemplaza esta ID con la ID de tu propia Hoja de Cálculo
const SPREADSHEET_ID = '1pOD4gQ41oirefqeX6Z3edPGrLTwRmMn_LQ89aPLBGw8';
const ORDERS_SHEET_NAME = 'Órdenes';
const MATERIALS_SHEET_NAME = 'Materiales';

// Función para manejar OPTIONS (CORS preflight)
function doOptions(e) {
  Logger.log('OPTIONS request received');
  const response = ContentService.createTextOutput();
  response.addHeader('Access-Control-Allow-Origin', '*');
  response.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.addHeader('Access-Control-Max-Age', '3600');
  return response;
}

// Función para manejar GET requests
function doGet(e) {
  Logger.log('GET request received with parameters: ' + JSON.stringify(e.parameter));
  
  try {
    const action = e.parameter.action;
    
    if (action === 'getData') {
      Logger.log('Processing getData request');
      
      // Verificar acceso a la hoja de cálculo
      let ss;
      try {
        ss = SpreadsheetApp.openById(SPREADSHEET_ID);
        Logger.log('Successfully opened spreadsheet');
      } catch (err) {
        Logger.log('Error opening spreadsheet: ' + err.toString());
        throw new Error('No se puede acceder a la hoja de cálculo. Verifica el ID y los permisos.');
      }
      
      const ordersSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
      const materialsSheet = ss.getSheetByName(MATERIALS_SHEET_NAME);
      
      // Crear hojas si no existen
      if (!ordersSheet) {
        Logger.log('Creating Orders sheet');
        const newOrdersSheet = ss.insertSheet(ORDERS_SHEET_NAME);
        newOrdersSheet.getRange(1, 1, 1, 8).setValues([['id', 'productReference', 'desiredQuantity', 'deliveryDate', 'creationDate', 'status', 'assignedRawMaterials', 'finishedProducts']]);
      }
      
      if (!materialsSheet) {
        Logger.log('Creating Materials sheet');
        const newMaterialsSheet = ss.insertSheet(MATERIALS_SHEET_NAME);
        newMaterialsSheet.getRange(1, 1, 1, 6).setValues([['id', 'materialCode', 'materialName', 'unit', 'type', 'recipe']]);
      }
      
      const orders = sheetDataToObjects(ordersSheet || ss.getSheetByName(ORDERS_SHEET_NAME));
      const materials = sheetDataToObjects(materialsSheet || ss.getSheetByName(MATERIALS_SHEET_NAME));
      
      Logger.log('Successfully retrieved data - Orders: ' + orders.length + ', Materials: ' + materials.length);
      
      return createJsonResponse({ 
        status: 'SUCCESS', 
        orders, 
        materials,
        timestamp: new Date().toISOString()
      });
      
    } else if (action === 'test') {
      Logger.log('Test request received');
      return createJsonResponse({ 
        status: 'SUCCESS', 
        message: 'API is working correctly',
        timestamp: new Date().toISOString()
      });
      
    } else {
      throw new Error('Acción no válida: ' + action);
    }
    
  } catch (err) {
    Logger.log('doGet Error: ' + err.toString() + '\nStack: ' + err.stack);
    return createJsonResponse({ 
      status: 'ERROR', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Función para manejar POST requests
function doPost(e) {
  Logger.log('POST request received');
  
  try {
    if (!e.postData || !e.postData.contents) {
      throw new Error('No se recibieron datos en la solicitud POST.');
    }
    
    Logger.log('POST data received: ' + e.postData.contents.substring(0, 200) + '...');
    
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    if (action === 'saveAllData') {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const allData = requestData.data;
      
      Logger.log('Saving data - Orders: ' + (allData.productionOrders?.length || 0) + ', Materials: ' + (allData.materialDefinitions?.length || 0));
      
      updateSheetWithData(ss.getSheetByName(ORDERS_SHEET_NAME), allData.productionOrders || []);
      updateSheetWithData(ss.getSheetByName(MATERIALS_SHEET_NAME), allData.materialDefinitions || []);
      
      Logger.log('Data saved successfully');
      
      return createJsonResponse({ 
        status: 'SUCCESS', 
        message: 'Datos guardados correctamente.',
        timestamp: new Date().toISOString()
      });
      
    } else {
      throw new Error('Acción POST no válida: ' + action);
    }
    
  } catch (err) {
    Logger.log('doPost Error: ' + err.toString() + '\nStack: ' + err.stack);
    return createJsonResponse({ 
      status: 'ERROR', 
      message: 'Error en el servidor: ' + err.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Función para crear respuestas JSON con headers CORS
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  output.addHeader('Access-Control-Allow-Origin', '*');
  output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.addHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

// Función para convertir datos de hoja a objetos
function sheetDataToObjects(sheet) {
  if (!sheet) {
    Logger.log('Sheet is null or undefined');
    return [];
  }
  
  try {
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log('Sheet has no data rows');
      return [];
    }
    
    const headers = data.shift().map(String);
    Logger.log('Sheet headers: ' + headers.join(', '));
    
    return data.map((row, index) => {
      const obj = {};
      headers.forEach((header, headerIndex) => {
        if (header) {
          let value = row[headerIndex];
          
          // Intentar parsear JSON si es necesario
          if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
            try {
              value = JSON.parse(value);
            } catch(e) {
              // Mantener como string si no es JSON válido
            }
          }
          
          obj[header] = value;
        }
      });
      return obj;
    });
    
  } catch (err) {
    Logger.log('Error in sheetDataToObjects: ' + err.toString());
    return [];
  }
}

// Función para actualizar hoja con datos
function updateSheetWithData(sheet, dataObjects) {
  if (!sheet) {
    Logger.log('Sheet is null, cannot update');
    return;
  }
  
  try {
    // Limpiar contenido
    sheet.clearContents();
    
    if (!dataObjects || dataObjects.length === 0) {
      Logger.log('No data to write to sheet');
      return;
    }
    
    const headers = Object.keys(dataObjects[0]);
    const dataArray = dataObjects.map(obj => 
      headers.map(header => {
        const value = obj[header];
        if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          return JSON.stringify(value);
        }
        return value;
      })
    );
    
    // Escribir headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    
    // Escribir datos
    if (dataArray.length > 0) {
      sheet.getRange(2, 1, dataArray.length, headers.length).setValues(dataArray);
    }
    
    // Autoajustar columnas
    headers.forEach((_, i) => sheet.autoResizeColumn(i + 1));
    
    Logger.log('Successfully updated sheet with ' + dataObjects.length + ' rows');
    
  } catch (err) {
    Logger.log('Error updating sheet: ' + err.toString());
    throw err;
  }
}
