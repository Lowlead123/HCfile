
// @ts-nocheck
/**
 * ============================================================================
 * 🚀 SIMPLE & ROBUST BACKEND: NoSQL in Google Sheets
 * ============================================================================
 * วิธีติดตั้ง:
 * 1. คัดลอกโค้ดทั้งหมดนี้
 * 2. ไปที่ Google Sheet > Extensions > Apps Script
 * 3. ลบของเก่าทิ้ง -> วางอันใหม่
 * 4. กด Deploy > Manage deployments > Edit > เลือก "New Version" > Deploy
 * 5. นำ URL ไปใส่ในหน้าเว็บ จบ! (ไม่ต้องขอสิทธิ์ Drive เพิ่ม)
 * ============================================================================
 */

function doGet(e) {
  return ContentService.createTextOutput("✅ System Online (Sheet-NoSQL Mode)");
}

function doPost(e) {
  var sheetId = "10UjuJUTIsi5gTXu4j95h3cxvNLAXK8k09KA_b13U8xk";
  
  // Create Lock to prevent collision
  var lock = LockService.getScriptLock();
  var request = {};
  
  try {
    request = JSON.parse(e.postData.contents);
  } catch (err) {
    return responseJSON({ result: "error", message: "Invalid JSON" });
  }

  var action = request.action;
  
  // Only lock for write operations
  var writeActions = ["register", "updateUserRole", "deleteUser", "savePatient", "deletePatient"];
  var needLock = writeActions.indexOf(action) !== -1;

  if (needLock) {
    try {
      lock.waitLock(30000);
    } catch (e) {
      return responseJSON({ result: "error", message: "Server busy. Please try again." });
    }
  }

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    
    // --- Helpers ---
    function cleanId(v) { return v ? String(v).trim() : ""; }
    function getSheet(name) {
      var s = ss.getSheetByName(name);
      if (!s) s = ss.insertSheet(name);
      return s;
    }
    
    // ============================================================
    // 👥 USERS (Sheet 1)
    // ============================================================
    if (["login", "register", "getUsers", "updateUserRole", "deleteUser"].indexOf(action) !== -1) {
       var userSheet = ss.getSheets()[0]; // Default Sheet
       var data = userSheet.getDataRange().getValues();

       if (action === "login") {
          var targetId = cleanId(request.username);
          var reqPass = cleanId(request.password);
          for (var i = 1; i < data.length; i++) {
            if (cleanId(data[i][0]) === targetId && cleanId(data[i][1]) === reqPass) {
              if (String(data[i][2]).toLowerCase() === 'pending') {
                 return responseJSON({ result: "error", message: "รอการอนุมัติจาก Admin" });
              }
              return responseJSON({
                result: "success",
                user: {
                  id: "row_" + (i+1),
                  username: String(data[i][0]),
                  roleId: String(data[i][2]).toLowerCase(),
                  displayName: String(data[i][3] || ""),
                  phoneNumber: String(data[i][4] || "")
                }
              });
            }
          }
          return responseJSON({ result: "error", message: "User/Pass ไม่ถูกต้อง" });
       }

       if (action === "register") {
          var targetId = cleanId(request.username);
          for (var i = 1; i < data.length; i++) {
            if (cleanId(data[i][0]) === targetId) return responseJSON({ result: "error", message: "ID ซ้ำ" });
          }
          userSheet.appendRow([request.username, request.password, "pending", request.displayName, request.phoneNumber]);
          return responseJSON({ result: "success" });
       }

       if (action === "getUsers") {
          var users = [];
          for (var i = 1; i < data.length; i++) {
             if(data[i][0]) {
               users.push({
                 id: "row_" + (i+1),
                 username: String(data[i][0]),
                 roleId: String(data[i][2]).toLowerCase(),
                 displayName: String(data[i][3] || data[i][0]),
                 phoneNumber: String(data[i][4] || "")
               });
             }
          }
          return responseJSON({ result: "success", users: users });
       }
       
       if (action === "updateUserRole") {
          var targetId = cleanId(request.username);
          for (var i = 1; i < data.length; i++) {
            if (cleanId(data[i][0]) === targetId) {
              userSheet.getRange(i + 1, 3).setValue(request.newRole); 
              return responseJSON({ result: "success" });
            }
          }
          return responseJSON({ result: "error", message: "User not found" });
       }

       if (action === "deleteUser") {
          var targetId = cleanId(request.username);
          for (var i = 1; i < data.length; i++) {
            if (cleanId(data[i][0]) === targetId) {
              userSheet.deleteRow(i + 1);
              return responseJSON({ result: "success" });
            }
          }
          return responseJSON({ result: "error", message: "User not found" });
       }
    }

    // ============================================================
    // 🏥 PATIENTS (Sheet Name: "DB_Patients_JSON")
    // ============================================================
    // เราจะเก็บข้อมูลคนไข้ 1 คน เป็น JSON String ใน Column A เพียงคอลัมน์เดียว
    // เพื่อตัดปัญหาเรื่อง Column ไม่ตรง หรือ Row เลื่อน
    
    var DB_SHEET_NAME = "DB_Patients_JSON";
    
    if (action === "getPatients") {
      var sheet = getSheet(DB_SHEET_NAME);
      var data = sheet.getDataRange().getValues();
      var items = [];
      
      // วนลูปอ่านข้อมูล (สมมติว่าไม่มี Header หรือถ้ามีให้เริ่ม i=1)
      // เริ่ม i=0 เลยเพราะเราจะเก็บ JSON ล้วนๆ
      for (var i = 0; i < data.length; i++) {
        var jsonStr = data[i][0]; // Column A
        if (jsonStr && jsonStr !== "") {
          try {
            var item = JSON.parse(jsonStr);
            items.push(item);
          } catch (e) {
            // Skip invalid json
          }
        }
      }
      return responseJSON({ result: "success", data: items });
    }

    if (action === "savePatient") {
      var sheet = getSheet(DB_SHEET_NAME);
      var item = request.item;
      var newItemJson = JSON.stringify(item);
      var targetId = cleanId(item.id);
      
      var data = sheet.getDataRange().getValues();
      var foundIndex = -1;
      
      // ค้นหาว่ามี ID นี้อยู่แล้วไหม (Update)
      for (var i = 0; i < data.length; i++) {
        try {
          var currentItem = JSON.parse(data[i][0]);
          if (cleanId(currentItem.id) === targetId) {
            foundIndex = i;
            break;
          }
        } catch (e) {}
      }

      if (foundIndex !== -1) {
        // Update: เขียนทับที่เดิม (Column A, Row i+1)
        sheet.getRange(foundIndex + 1, 1).setValue(newItemJson);
      } else {
        // Create: ต่อท้าย
        sheet.appendRow([newItemJson]);
      }
      
      return responseJSON({ result: "success" });
    }

    if (action === "deletePatient") {
      var sheet = getSheet(DB_SHEET_NAME);
      var targetId = cleanId(request.itemId);
      var data = sheet.getDataRange().getValues();
      
      // Reverse loop เพื่อลบอย่างปลอดภัย
      for (var i = data.length - 1; i >= 0; i--) {
        try {
          var currentItem = JSON.parse(data[i][0]);
          if (cleanId(currentItem.id) === targetId) {
            sheet.deleteRow(i + 1);
            return responseJSON({ result: "success" });
          }
        } catch (e) {}
      }
      
      return responseJSON({ result: "error", message: "Item not found" });
    }

    return responseJSON({ result: "error", message: "Unknown action: " + action });

  } catch (error) {
    return responseJSON({ result: "error", message: "System Error: " + error.toString() });
  } finally {
    if (needLock) {
      lock.releaseLock();
    }
  }
}

function responseJSON(d) { 
  return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON); 
}
