let students = window.STUDENTS_DATA || {}

function populateStudentsList(){
  let list = document.getElementById("studentsList")
  list.innerHTML = ""
  for(let s in students){
    let opt = document.createElement("option")
    opt.value = s
    list.appendChild(opt)
  }
}
populateStudentsList()

// Also keep fetch for refreshing after admin adds a student
function loadStudents(){
  fetch("/students")
  .then(r => r.json())
  .then(data => {
    students = data
    populateStudentsList()
  })
  .catch(()=>{})
}

const RATES = { "Without Image": 2, "With Image": 3, "Image Only": 5 }
const TYPE_OPTIONS = `
  <option value="Without Image">Without Image - Rs.2</option>
  <option value="With Image">With Image - Rs.3</option>
  <option value="Image Only">Image Only - Rs.5</option>
`

let currentUser = null
let billItemCount = 0
let deptBillItemCount = 0

// ---- Auth ----
function openLoginModal(){
  document.getElementById("loginModal").classList.add("open")
  document.getElementById("modalUsername").focus()
  document.getElementById("loginError").style.display = "none"
  document.getElementById("modalUsername").value = ""
  document.getElementById("modalPassword").value = ""
}
function closeLoginModal(){
  document.getElementById("loginModal").classList.remove("open")
}
document.getElementById("loginModal").addEventListener("click", function(e){
  if(e.target === this) closeLoginModal()
})
document.getElementById("modalPassword").addEventListener("keydown", e => { if(e.key==="Enter") submitLogin() })
document.getElementById("modalUsername").addEventListener("keydown", e => { if(e.key==="Enter") submitLogin() })

function submitLogin(){
  let username = document.getElementById("modalUsername").value.trim()
  let password = document.getElementById("modalPassword").value.trim()
  fetch("/login", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({username, password})
  })
  .then(r=>r.json())
  .then(data=>{
    if(data.status==="ok"){ currentUser=data.username; closeLoginModal(); updateAuthUI(true) }
    else { document.getElementById("loginError").style.display="block" }
  })
  .catch(()=>{ document.getElementById("loginError").style.display="block" })
}

function signOut(){
  fetch("/logout",{method:"POST"}).then(()=>{ currentUser=null; updateAuthUI(false) })
}

function updateAuthUI(isAuth){
  let userLabel        = document.getElementById("userLabel")
  let authBtn          = document.getElementById("authBtn")
  let entryLocked      = document.getElementById("entryLocked")
  let entryForm        = document.getElementById("entryForm")
  let actionHeader     = document.getElementById("actionHeader")
  let deptActionHeader = document.getElementById("deptActionHeader")
  let actionCells      = document.querySelectorAll(".action-cell")
  let deptActionCells  = document.querySelectorAll(".dept-action-cell")

  if(isAuth){
    userLabel.textContent = "Signed in as " + currentUser
    userLabel.className = "auth-label"
    authBtn.textContent = "Sign Out"
    authBtn.onclick = signOut
    let adminBtn = document.getElementById("adminBtn")
    adminBtn.style.display = "flex"
    adminBtn.innerHTML = `<svg style="width:14px;height:14px;fill:currentColor" viewBox="0 0 512 512"><path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/></svg> Settings`
    entryLocked.style.display = "none"
    entryForm.style.display = "block"
    document.getElementById("entryUser").textContent = currentUser
    actionHeader.style.display = ""
    setTimeout(()=>{ checkAutoMonthlyExport() }, 1500)
    deptActionHeader.style.display = ""
    actionCells.forEach(c=>c.style.display="")
    deptActionCells.forEach(c=>c.style.display="")
    // Add first bill item automatically
    if(document.getElementById("billItems").children.length === 0) addBillItem()
    if(document.getElementById("deptBillItems").children.length === 0) addDeptBillItem()
  } else {
    userLabel.textContent = "Viewing as guest"
    userLabel.className = "guest-label"
    authBtn.textContent = "Sign In"
    authBtn.onclick = openLoginModal
    document.getElementById("adminBtn").style.display = "none"
    entryLocked.style.display = "block"
    entryForm.style.display = "none"
    actionHeader.style.display = "none"
    deptActionHeader.style.display = "none"
    actionCells.forEach(c=>c.style.display="none")
    deptActionCells.forEach(c=>c.style.display="none")
  }
}

// Students loaded dynamically from students.json

document.getElementById("name").addEventListener("input", function(){
  let n = this.value.trim()
  if(students[n]){
    document.getElementById("reg").value = students[n]
  } else {
    // Try case-insensitive match
    let match = Object.keys(students).find(k => k.toLowerCase() === n.toLowerCase())
    document.getElementById("reg").value = match ? students[match] : ""
  }
})

document.getElementById("name").addEventListener("change", function(){
  let n = this.value.trim()
  if(students[n]){
    document.getElementById("reg").value = students[n]
  } else {
    let match = Object.keys(students).find(k => k.toLowerCase() === n.toLowerCase())
    if(match){
      this.value = match
      document.getElementById("reg").value = students[match]
    }
  }
})

// ---- Bill items ----
function addBillItem(){
  billItemCount++
  let id = "item_" + billItemCount
  let row = document.createElement("tr")
  row.id = id
  row.innerHTML = `
    <td><select onchange="updateItemTotal('${id}')">${TYPE_OPTIONS}</select></td>
    <td><input type="number" min="1" placeholder="0" oninput="updateItemTotal('${id}')"></td>
    <td class="item-total">Rs. 0</td>
    <td><button class="del-btn" onclick="removeBillItem('${id}')">X</button></td>
  `
  document.getElementById("billItems").appendChild(row)
  updateGrandTotal()
}

function addDeptBillItem(){
  deptBillItemCount++
  let id = "ditem_" + deptBillItemCount
  let row = document.createElement("tr")
  row.id = id
  row.innerHTML = `
    <td><select onchange="updateDeptItemTotal('${id}')">${TYPE_OPTIONS}</select></td>
    <td><input type="number" min="1" placeholder="0" oninput="updateDeptItemTotal('${id}')"></td>
    <td class="dept-item-total">Rs. 0</td>
    <td><button class="del-btn" onclick="removeDeptBillItem('${id}')">X</button></td>
  `
  document.getElementById("deptBillItems").appendChild(row)
  updateDeptGrandTotal()
}

function removeBillItem(id){
  let row = document.getElementById(id)
  if(row) row.remove()
  updateGrandTotal()
}

function removeDeptBillItem(id){
  let row = document.getElementById(id)
  if(row) row.remove()
  updateDeptGrandTotal()
}

function updateItemTotal(id){
  let row = document.getElementById(id)
  let type = row.querySelector("select").value
  let pages = parseFloat(row.querySelector("input").value) || 0
  let rate = RATES[type] || 0
  let total = pages * rate
  row.querySelector(".item-total").textContent = "Rs. " + total
  updateGrandTotal()
}

function updateDeptItemTotal(id){
  let row = document.getElementById(id)
  let type = row.querySelector("select").value
  let pages = parseFloat(row.querySelector("input").value) || 0
  let rate = RATES[type] || 0
  let total = pages * rate
  row.querySelector(".dept-item-total").textContent = "Rs. " + total
  updateDeptGrandTotal()
}

function updateGrandTotal(){
  let total = 0
  document.querySelectorAll("#billItems .item-total").forEach(td => {
    total += parseFloat(td.textContent.replace("Rs. ","")) || 0
  })
  document.getElementById("grandTotal").textContent = total
}

function updateDeptGrandTotal(){
  let total = 0
  document.querySelectorAll("#deptBillItems .dept-item-total").forEach(td => {
    total += parseFloat(td.textContent.replace("Rs. ","")) || 0
  })
  document.getElementById("deptGrandTotal").textContent = total
}

// Build details string from bill items
function buildDetails(tableId, totalClass){
  let rows = document.getElementById(tableId).getElementsByTagName("tr")
  let details = []
  let grandTotal = 0
  for(let i=0; i<rows.length; i++){
    let selectEl = rows[i].querySelector("select")
    let inputEl  = rows[i].querySelector("input[type=number]")
    if(!selectEl || !inputEl) continue
    let type  = selectEl.value
    let pages = parseFloat(inputEl.value) || 0
    let rate  = RATES[type] || 0
    let total = pages * rate
    if(pages > 0){ details.push(type + " x" + pages + " = Rs." + total); grandTotal += total }
  }
  return { details: details.join(" | "), grandTotal }
}

// ---- Submit bills ----
function submitBill(){
  if(!currentUser){ openLoginModal(); return }
  let name = document.getElementById("name").value.trim()
  let reg  = document.getElementById("reg").value.trim()

  if(!name){ alert("Please enter a student name"); return }
  if(!reg){
    // Try to find reg from students object
    let match = Object.keys(students).find(k => k.toLowerCase() === name.toLowerCase())
    if(match){
      name = match
      reg = students[match]
      document.getElementById("name").value = match
      document.getElementById("reg").value = reg
    } else {
      alert("Please select a valid student name from the list"); return
    }
  }

  let { details, grandTotal } = buildDetails("billItems", "item-total")
  if(grandTotal === 0){ alert("Please add at least one item with pages"); return }

  let date = new Date().toLocaleDateString()

  fetch("/save", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ name, reg, type: details, pages: "-", total: grandTotal, date, category:"student" })
  })
  .then(r=>r.json())
  .then(data=>{
    let row = document.createElement("tr")
    row.setAttribute("data-id", data.id)
    row.innerHTML = `
      <td>${name}</td>
      <td>${reg}</td>
      <td style="font-size:11px;text-align:left;">${details}</td>
      <td>${grandTotal}</td>
      <td>${date}</td>
      <td><span class="added-by-badge">${data.added_by}</span></td>
      <td class="action-cell"><button onclick="markPaid(this)">Paid</button></td>
    `
    document.getElementById("duesTable").appendChild(row)

    let msg = document.getElementById("message")
    msg.innerText = "Bill submitted successfully!"
    setTimeout(()=>{ msg.innerText="" }, 3000)

    document.getElementById("name").value = ""
    document.getElementById("reg").value = ""
    document.getElementById("billItems").innerHTML = ""
    billItemCount = 0
    addBillItem()
    updateGrandTotal()
  })
  .catch(()=>alert("Failed to save. Please sign in again."))
}

function submitDeptBill(){
  if(!currentUser){ openLoginModal(); return }
  let name = document.getElementById("deptName").value.trim()
  if(!name){ alert("Please enter department name"); return }

  let { details, grandTotal } = buildDetails("deptBillItems", "dept-item-total")
  if(grandTotal === 0){ alert("Please add at least one item with pages"); return }

  let date = new Date().toLocaleDateString()

  fetch("/save", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ name, reg: name, type: details, pages: "-", total: grandTotal, date, category:"department" })
  })
  .then(r=>r.json())
  .then(data=>{
    let row = document.createElement("tr")
    row.setAttribute("data-id", data.id)
    row.innerHTML = `
      <td>${name}</td>
      <td style="font-size:11px;text-align:left;">${details}</td>
      <td>${grandTotal}</td>
      <td>${date}</td>
      <td><span class="added-by-badge">${data.added_by}</span></td>
      <td class="dept-action-cell"><button onclick="markDeptPaid(this)">Paid</button></td>
    `
    document.getElementById("deptDuesTable").appendChild(row)
    updateDeptTotal()

    let msg = document.getElementById("deptMessage")
    msg.innerText = "Department bill submitted!"
    setTimeout(()=>{ msg.innerText="" }, 3000)

    document.getElementById("deptName").value = ""
    document.getElementById("deptBillItems").innerHTML = ""
    deptBillItemCount = 0
    addDeptBillItem()
    updateDeptGrandTotal()
  })
  .catch(()=>alert("Failed to save. Please sign in again."))
}

// ---- Tabs ----
function showTab(tab){
  document.querySelectorAll(".tabContent").forEach(t=>t.style.display="none")
  document.getElementById(tab).style.display="block"
  if(tab==="deptDues") updateDeptTotal()
}
showTab("entry")

// ---- Mark Paid ----
function markPaid(btn){
  if(!currentUser){ openLoginModal(); return }
  let row = btn.parentElement.parentElement
  let id = row.getAttribute("data-id")
  let cells = row.children
  fetch("/mark_paid",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})})
  .then(r=>r.json())
  .then(()=>{
    let newRow = document.createElement("tr")
    newRow.setAttribute("data-id", id)
    newRow.innerHTML = `
      <td>${cells[0].innerText}</td>
      <td>${cells[1].innerText}</td>
      <td style="font-size:11px;text-align:left;">${cells[2].innerText}</td>
      <td>${cells[3].innerText}</td>
      <td>${cells[4].innerText}</td>
      <td>${cells[5].innerHTML}</td>
    `
    document.getElementById("paidTable").appendChild(newRow)
    row.remove()
  })
}

function markDeptPaid(btn){
  if(!currentUser){ openLoginModal(); return }
  let row = btn.parentElement.parentElement
  let id = row.getAttribute("data-id")
  fetch("/mark_paid",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})})
  .then(r=>r.json())
  .then(()=>{ row.remove(); updateDeptTotal() })
}

function updateDeptTotal(){
  let rows = document.getElementById("deptDuesTable").getElementsByTagName("tr")
  let total = 0
  for(let i=0;i<rows.length;i++){
    let cells = rows[i].getElementsByTagName("td")
    if(cells.length < 3) continue
    total += parseFloat(cells[2].innerText) || 0
  }
  document.getElementById("totalDeptDue").innerText = total
}

// ---- Search ----
function checkDues(){
  let searchValue = document.getElementById("searchName").value.toLowerCase()
  let rows = document.getElementById("duesTable").getElementsByTagName("tr")
  let total = 0
  for(let i=0;i<rows.length;i++){
    let cells = rows[i].getElementsByTagName("td")
    if(cells.length < 4) continue
    let nameCell  = cells[0].innerText.toLowerCase()
    let totalCell = parseFloat(cells[3].innerText) || 0
    if(searchValue==="" || nameCell.includes(searchValue)){
      rows[i].style.display = ""
      total += totalCell
    } else {
      rows[i].style.display = "none"
    }
  }
  document.getElementById("totalDue").innerText = total
}

// ---- Export Excel ----
function buildExcelData(){
  // Combine student entries by registration number
  let studentsSummary = {}
  let duesRows = document.getElementById("duesTable").getElementsByTagName("tr")
  for(let i=0;i<duesRows.length;i++){
    let cells = duesRows[i].getElementsByTagName("td")
    if(cells.length < 4) continue
    let name  = cells[0].innerText.trim()
    let reg   = cells[1].innerText.trim()
    let total = parseFloat(cells[3].innerText) || 0
    let key   = reg || name
    if(studentsSummary[key]){ studentsSummary[key].total += total }
    else { studentsSummary[key] = { name, reg, total } }
  }

  // Combine department entries by name
  let deptSummary = {}
  let deptRows = document.getElementById("deptDuesTable").getElementsByTagName("tr")
  for(let i=0;i<deptRows.length;i++){
    let cells = deptRows[i].getElementsByTagName("td")
    if(cells.length < 3) continue
    let name  = cells[0].innerText.trim()
    let total = parseFloat(cells[2].innerText) || 0
    if(deptSummary[name]){ deptSummary[name] += total }
    else { deptSummary[name] = total }
  }

  let studentsData = [["Name","Registration","Total Due"]]
  let deptData     = [["Department","Total Due"]]
  for(let k in studentsSummary){ let e = studentsSummary[k]; studentsData.push([e.name, e.reg, e.total]) }
  for(let name in deptSummary){ deptData.push([name, deptSummary[name]]) }

  return { studentsData, deptData }
}

function generateExcel(data, filename){
  let studentsData = [["Name","Registration","Total Due"]]
  let deptData     = [["Department","Total Due"]]
  data.students.forEach(e => studentsData.push([e.name, e.reg, e.total]))
  data.departments.forEach(e => deptData.push([e.name, e.total]))

  let wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(studentsData), "Students")
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(deptData),     "Departments")
  XLSX.writeFile(wb, filename)
}

function exportToExcel(){
  fetch("/export_data")
  .then(r=>r.json())
  .then(data=>{
    if(data.students.length===0 && data.departments.length===0){
      alert("No dues to export!"); return
    }
    let date = new Date().toLocaleDateString().replace(/\//g,"-")
    generateExcel(data, "Xerox_Dues_" + date + ".xlsx")
  })
}

// ---- Auto monthly export ----
function checkAutoMonthlyExport(){
  let now = new Date()
  let currentMonth = now.getFullYear() + "-" + (now.getMonth()+1)
  let lastExported = localStorage.getItem("lastAutoExport")
  if(lastExported === currentMonth) return

  fetch("/export_data")
  .then(r=>r.json())
  .then(data=>{
    if(data.students.length===0 && data.departments.length===0) return

    let monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    let fileName = "Xerox_Dues_" + monthNames[now.getMonth()] + "_" + now.getFullYear() + ".xlsx"
    generateExcel(data, fileName)

    localStorage.setItem("lastAutoExport", currentMonth)

    let msg = document.createElement("div")
    msg.style.cssText = "position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:12px 18px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2)"
    msg.innerText = "Monthly dues exported automatically!"
    document.body.appendChild(msg)
    setTimeout(()=>{ msg.remove() }, 4000)
  })
}

// Run auto export check after page loads (only when signed in)
setTimeout(()=>{
  if(currentUser) checkAutoMonthlyExport()
}, 2000)

// ---- Admin Panel ----
function openAdmin(){
  document.getElementById("adminOverlay").classList.add("open")
  loadAdminStudents()
  // Check if super admin silently
  fetch("/admin/is_super")
  .then(r=>r.json())
  .then(data=>{
    let usersSection = document.getElementById("usersSection")
    let usersDivider = document.getElementById("usersDivider")
    if(data.super){
      usersSection.style.display = "block"
      usersDivider.style.display = "block"
      loadAdminUsers()
    } else {
      usersSection.style.display = "none"
      usersDivider.style.display = "none"
    }
  })
}

function closeAdmin(){
  document.getElementById("adminOverlay").classList.remove("open")
}

document.getElementById("adminOverlay").addEventListener("click", function(e){
  if(e.target === this) closeAdmin()
})

function loadAdminUsers(){
  fetch("/admin/users")
  .then(r=>r.json())
  .then(users=>{
    let ul = document.getElementById("usersList")
    ul.innerHTML = ""
    for(let name in users){
      let li = document.createElement("li")
      // Hide remove button for current user (super admin)
      let removeBtn = name === currentUser ? '' : `<button class="remove-btn" onclick="removeUser('${name}')">Remove</button>`
      li.innerHTML = `<span>${name} <span style="color:#888;font-size:11px;">— ${users[name]}</span></span>${removeBtn}`
      ul.appendChild(li)
    }
  })
}

function loadAdminStudents(){
  fetch("/admin/students")
  .then(r=>r.json())
  .then(data=>{
    let ul = document.getElementById("studentsList2")
    ul.innerHTML = ""
    for(let name in data){
      let li = document.createElement("li")
      li.innerHTML = `<span>${name} <span style="color:#888;font-size:11px;">${data[name]}</span></span><button class="remove-btn" onclick="removeStudent('${name}')">Remove</button>`
      ul.appendChild(li)
    }
  })
}

function addUser(){
  let name = document.getElementById("newUserName").value.trim()
  let pass = document.getElementById("newUserPass").value.trim()
  if(!name || !pass){ alert("Enter both name and password"); return }
  fetch("/admin/users/add", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name, password: pass})
  })
  .then(r=>r.json())
  .then(()=>{
    document.getElementById("newUserName").value = ""
    document.getElementById("newUserPass").value = ""
    loadAdminUsers()
  })
}

function removeUser(name){
  if(!confirm("Remove user: " + name + "?")) return
  fetch("/admin/users/remove", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name})
  })
  .then(r=>r.json())
  .then(()=>loadAdminUsers())
}

function addStudent(){
  let name = document.getElementById("newStudentName").value.trim()
  let reg  = document.getElementById("newStudentReg").value.trim()
  if(!name || !reg){ alert("Enter both name and registration number"); return }
  fetch("/admin/students/add", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name, reg})
  })
  .then(r=>r.json())
  .then(()=>{
    document.getElementById("newStudentName").value = ""
    document.getElementById("newStudentReg").value = ""
    loadAdminStudents()
    // Refresh student autocomplete
    fetch("/students").then(r=>r.json()).then(data=>{
      students = data
      let list = document.getElementById("studentsList")
      list.innerHTML = ""
      for(let s in students){
        let opt = document.createElement("option")
        opt.value = s
        list.appendChild(opt)
      }
    })
  })
}

function removeStudent(name){
  if(!confirm("Remove student: " + name + "?")) return
  fetch("/admin/students/remove", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({name})
  })
  .then(r=>r.json())
  .then(()=>loadAdminStudents())
}