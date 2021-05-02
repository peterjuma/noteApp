(this.webpackJsonpreact=this.webpackJsonpreact||[]).push([[0],{117:function(t,e){},343:function(t,e,n){},344:function(t,e,n){"use strict";n.r(e);var o=n(1),a=n.n(o),i=n(35),s=n.n(i),c=n(5),l=n.n(c),r=n(10),d=n(48),u=n(36),h=n(37),b=n(4),f=n(49),p=n(47),j=n(0);var m=function(t){var e={noteid:Math.random().toString(16).slice(2),notetitle:"",notebody:"",activepage:"",action:"addnote"},n=a.a.useRef();return Object(j.jsxs)("div",{children:[Object(j.jsx)("div",{className:"nav-bar-left",children:Object(j.jsxs)("div",{className:"nav-left-icon",children:[Object(j.jsx)("span",{tooltip:"Home",flow:"right",children:Object(j.jsx)("i",{id:"homeBtn",onClick:function(e){return t.handleClickHomeBtn(e)},className:"fa fa-home btn","aria-hidden":"true"})}),Object(j.jsx)("h4",{children:"Notes"}),Object(j.jsx)("span",{tooltip:"Add Note",flow:"left",children:Object(j.jsx)("i",{id:"addNoteBtn","data-action":"addnote",onClick:function(n){return t.handleEditNoteBtn(n,e)},className:"fa fa-plus btn","aria-hidden":"true"})})]})}),Object(j.jsxs)("div",{className:"search-bar",children:[Object(j.jsx)("i",{className:"fa fa-search searchButton","aria-hidden":"true",onClick:function(){n.current.focus()}}),Object(j.jsx)("input",{type:"search",placeholder:"Search Notes",className:"search-field",ref:n,onChange:function(e){return t.handleSearchNotes(e)}})]})]})};var x=function(t){return Object(j.jsxs)("div",{className:"sort-order-selector",children:[Object(j.jsxs)("label",{children:["Sort by:",Object(j.jsxs)("select",{id:"sort-selection",defaultValue:"<option> Choose here</option>",onChange:function(e){return t.handleSortNotes()},children:[Object(j.jsx)("option",{children:" Choose here"}),Object(j.jsx)("option",{value:"3",children:"Created: Oldest"}),Object(j.jsx)("option",{value:"2",children:"Created: Newest"}),Object(j.jsx)("option",{value:"0",children:"Title: A-Z"}),Object(j.jsx)("option",{value:"1",children:"Title: Z-A"}),Object(j.jsx)("option",{value:"4",children:"Modified: Newest"}),Object(j.jsx)("option",{value:"5",children:"Modified: Oldest"})]})]}),Object(j.jsx)("div",{className:"backupbtn",children:Object(j.jsx)("span",{tooltip:"Download Backup",flow:"left",children:Object(j.jsx)("i",{className:"fas fa-download btn",onClick:t.handleNotesBackup})})})]})};var g=function(t){var e=t.display,n=t.notesData;return Object(j.jsx)("div",{className:!0===e?"nav-bar":"hidden",children:Object(j.jsxs)("div",{children:[Object(j.jsx)("span",{tooltip:"Copy",flow:"down",children:Object(j.jsx)("i",{className:"far fa-copy btn",id:"copyBtn",onClick:function(e){return t.handleCopyEvent(e,n.notebody)}})}),Object(j.jsx)("span",{tooltip:"Edit",flow:"down",children:Object(j.jsx)("i",{className:"far fa-edit btn",id:"editbtn","data-action":"updatenote",onClick:function(e){return t.handleEditNoteBtn(e,n)},children:" "})}),Object(j.jsxs)("div",{style:{float:"right"},children:[Object(j.jsx)("span",{tooltip:"Download",flow:"down",children:Object(j.jsx)("i",{className:"far fa-arrow-alt-circle-down btn","aria-hidden":"true",onClick:function(e){return t.handleDownloadNote(n)}})}),Object(j.jsx)("span",{tooltip:"Delete",flow:"down",children:Object(j.jsx)("i",{className:"far fa-trash-alt btn","aria-hidden":"true",onClick:function(e){return t.handleDeleteNote(e,n)}})})]})]})})};var v=function(t){var e=t.note,n="addnote"===e.action?"note-list-item note-list-item-clicked":"note-list-item";return Object(j.jsx)("li",{className:n,id:e.noteid,onClick:function(n){return t.handleClick(n,e)},onMouseOver:function(n){return t.handleMouseOver(n,e)},onMouseOut:function(e){return t.handleMouseOut(e)},children:e.title})},y=n(38),O=n.n(y),k=n(39),N=n.n(k),C=n(40),S=n.n(C),E=n(41),w=n(42),B=new E.a,_=w.a;B.use(_);var D=new S.a;D.use(O.a),D.use(N.a);var I=function(t){var e=t.notesData;return Object(j.jsxs)("div",{className:"main",children:[Object(j.jsx)("div",{className:"page-header",children:Object(j.jsx)("h2",{id:"notetitle-view",dangerouslySetInnerHTML:{__html:D.render(e.notetitle)}})}),Object(j.jsx)("div",{className:"markdown-body",id:"notebody-view",dangerouslySetInnerHTML:{__html:D.render(e.notebody)},onCopy:function(e){return t.handleCopyEvent(e)}})]})},L=n.p+"static/media/README.7753bf41.md",T=n(3),M=n(7),H=n(6),A=n.n(H);var q=function(t){var e=t.note,n={note_preview:{width:"50%",height:"100%",borderLeft:"1px solid #dcdcde"},title:{paddingTop:"40px",paddingBottom:"10px",margin:"0 50px",borderBottom:"1px solid #eee",height:"100px"},body:{color:"#24292e",fontFamily:"-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji",fontSize:"16px",lineHeight:"1.5",wordWrap:"break-word",overflow:"auto",height:"calc(100% - 150px)",padding:"40px 50px 50px"},bottom:{position:"absolute",bottom:"0",borderTop:"1px solid #dcdcde",height:"50px",width:"50%"}};return Object(j.jsx)(a.a.Fragment,{children:Object(j.jsxs)("div",{style:n.note_preview,children:[Object(j.jsx)("h2",{style:n.title,dangerouslySetInnerHTML:{__html:A()(e.notetitle||"")}}),Object(j.jsx)("div",{style:n.body,dangerouslySetInnerHTML:{__html:A()(e.notebody||"")}}),Object(j.jsx)("div",{style:n.bottom})]})})},R="\n```\n",U={backticks:{open:"`",close:"`",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},doublequote:{open:'"',close:'"',pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},singlequote:{open:"'",close:"'",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},bold:{open:"**",close:"**",pattern:"",regEx:!1,offsetStart:2,offsetEnd:2},italic:{open:"_",close:"_",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},strike:{open:"~~",close:"~~",pattern:"",regEx:!1,offsetStart:2,offsetEnd:2},codeblock:{open:R,close:R,pattern:"",regEx:!1,offsetStart:5,offsetEnd:5},brackets:{open:"(",close:")",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},curlybrackets:{open:"{",close:"}",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},squarebrackets:{open:"[",close:"]",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},anglebrackets:{open:"<",close:">",pattern:"",regEx:!1,offsetStart:1,offsetEnd:1},link:{open:"",close:"",pattern:"",regEx:!1,offsetStart:7,offsetEnd:7},image:{open:"",close:"",pattern:"",regEx:!1,offsetStart:12,offsetEnd:12},table:{open:"",close:"",pattern:"\ncolumn1 | column2 | column3\n------- | ------- | -------\ncolumn1 | column2 | column3\ncolumn1 | column2 | column3\ncolumn1 | column2 | column3\n",regEx:!1,offsetStart:1,offsetEnd:1},hline:{open:"",close:"",pattern:"\n----",regEx:!1,offsetStart:"",offsetEnd:""},ulist:{open:"",close:"",pattern:"- ",regEx:!0,offsetStart:2,offsetEnd:2},olist:{open:"",close:"",pattern:"1. ",regEx:!0,offsetStart:3,offsetEnd:3},tasklist:{open:"",close:"",pattern:"- [ ]",regEx:!0,offsetStart:6,offsetEnd:6},heading:{open:"",close:"",pattern:"###",regEx:!0,offsetStart:4,offsetEnd:4},blockquote:{open:"",close:"",pattern:"> ",regEx:!0,offsetStart:2,offsetEnd:2},tab:{open:"",close:"",pattern:"\t",regEx:!0,offsetStart:"",offsetEnd:""}},F=n(46);var K=function(t){var e=t.editNoteData,n=Object(o.useState)(16),a=Object(M.a)(n,2),i=a[0],s=a[1],c=Object(o.useState)(!1),l=Object(M.a)(c,2),r=l[0],d=l[1],u={main_editor:{paddingLeft:"5px",paddingRight:"1px",height:"100%",display:"flex",flexDirection:"column",width:r?"50%":"100%"},buttons:{display:"inline-flex",float:"right",borderLeft:"1px solid #dcdcde"},textarea:{display:"flex",flexDirection:"column",maxWidth:"1440px",margin:"0 auto",width:"100%",padding:"50px 60px",fontSize:"".concat(i,"px"),fontWeight:"400",overflow:"auto",lineHeight:"1.45",borderRadius:"0",resize:"none",boxShadow:"none",border:"none",height:"100%",borderRadius:"5px"},inputNum:{width:"4.26rem",height:"2.7rem",borderRadius:"4px 2px 2px 4px",color:"#292a2b",padding:"0.1ex 1ex",border:"1px solid #ccc",fontWeight:250,textShadow:"1px 1px 1px rgba(0, 0, 0, 0.1)",outline:"none",display:"inline-flex",alignItems:"center",justifyContent:"center"},dark:{backgroundColor:"hsl(0, 0%, 14%)",color:"#afafaf"},light:{backgroundColor:"#fafafa",color:"#000000"},mdtools_dark:{backgroundColor:"hsl(0, 0%, 14%)",color:"#292a2b"},btn_dark:{backgroundColor:"hsl(0, 0%, 14%)",color:"#afafaf"},mdtools_light:{color:"#333",backgroundColor:"#fff"},btn_light:{backgroundColor:"#fff",color:"#777"}},h=r?{split:!0,buttonClass:"far fa-window-maximize fa-lg md_btn",description:"Full Screen"}:{split:!1,buttonClass:"fas fa-columns fa-lg md_btn",description:"Split Screen"},b=Object(o.useState)(h),f=Object(M.a)(b,2),p=f[0],m=f[1],x=function(){g(p,m),d(!r)},g=function(t,e){t.split?e({split:!1,buttonClass:"fas fa-columns fa-lg md_btn",description:"Split Screen"}):e({split:!0,buttonClass:"far fa-window-maximize fa-lg md_btn",description:"Full Screen"})},v=Object(o.useState)({theme:"vs-light",description:"Dark Mode",themeclass:"fas fa-moon fa-lg md_btn",buttonstyle:Object(T.a)({},u.btn_light)}),y=Object(M.a)(v,2),O=y[0],k=y[1],N=function(t,e){"vs-dark"==t.theme?e({theme:"vs-light",description:"Dark Mode",themeclass:"fas fa-moon fa-lg md_btn",buttonstyle:Object(T.a)({},u.btn_light)}):e({theme:"vs-dark",description:"Light Mode",themeclass:"fas fa-sun fa-lg md_btn",buttonstyle:Object(T.a)({},u.btn_dark)})},C=Object(o.useState)(e.notebody),S=Object(M.a)(C,2),E=S[0],w=S[1],_=Object(o.useState)(e.notetitle),D=Object(M.a)(_,2),I=D[0],L=D[1],H=Object(o.useRef)(),R=Object(o.useState)({start:0,end:0}),K=Object(M.a)(R,2),z=K[0],Z=K[1],W=function(t){var e=document.querySelector("textarea"),n=e.selectionStart,o=e.selectionEnd,a=E,i=a.substring(n,o),s="![alt text](".concat(i,")"),c="[link](".concat(i,")");U.image.pattern=s,U.link.pattern=c;var l=U[t];if(l.regEx){var r="";if(/\r|\n/.exec(i)){for(var d=i.split("\n"),u=0;u<d.length;u++)d[u].length>0&&void 0!==d[u]&&(r+="".concat(l.pattern," ").concat(d[u],"\n"));i=r}else i=i.replace(/^/gm,"".concat(l.pattern," "));(h="".concat(a.substring(0,n)).concat(i).concat(a.substring(o,a.length)))&&(w(h),Z("tab"===t?{start:n+i.length,end:n+i.length}:{start:n+l.offsetStart,end:n+l.offsetStart}))}else{if(""!==l.pattern)if("image"==t||"link"==t)var h="".concat(a.substring(0,n)).concat(l.pattern).concat(a.substring(o,a.length));else h="".concat(a.substring(0,n)).concat(i).concat(l.pattern).concat(a.substring(o,a.length));else h="".concat(a.substring(0,n)).concat(l.open).concat(i).concat(l.close).concat(a.substring(o,a.length));h&&(w(h),Z({start:n+l.offsetStart,end:o+l.offsetEnd}))}},J=Object(o.useRef)();return Object(o.useEffect)((function(){J.current.selectionStart=z.start,J.current.selectionEnd=z.end,J.current.focus()}),[E]),Object(j.jsxs)("div",{className:"right-row",children:[Object(j.jsx)("div",{}),Object(j.jsxs)("div",{style:u.main_editor,children:[Object(j.jsx)("div",{className:"title-header",children:Object(j.jsx)("input",{name:"notetitle",type:"text",id:"notetitle","data-action":e.action,value:I,placeholder:"Title",autoComplete:"off",ref:H,onChange:function(t){return function(t){L(t.target.value)}(t)},style:"vs-light"===O.theme?Object(T.a)({},u.light):Object(T.a)({},u.dark)})}),Object(j.jsxs)("div",{className:"md-editor-tools",id:"mdtools",style:"vs-light"===O.theme?Object(T.a)({},u.mdtools_light):Object(T.a)({},u.mdtools_dark),children:[Object(j.jsx)("span",{tooltip:"Bold",children:Object(j.jsx)("i",{className:"fas fa-bold md_btn",onClick:function(t){return W("bold")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Italic",children:Object(j.jsx)("i",{className:"fas fa-italic md_btn",onClick:function(t){return W("italic")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Heading",children:Object(j.jsx)("i",{className:"fas fa-heading md_btn",onClick:function(t){return W("heading")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Link",children:Object(j.jsx)("i",{className:"fas fa-link md_btn",onClick:function(t){return W("link")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"OList",children:Object(j.jsx)("i",{className:"fas fa-list-ol md_btn",onClick:function(t){return W("olist")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"UList",children:Object(j.jsx)("i",{className:"fas fa-list md_btn",onClick:function(t){return W("ulist")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Blockquote",children:Object(j.jsx)("i",{className:"fas fa-quote-left md_btn",onClick:function(t){return W("blockquote")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Image",children:Object(j.jsx)("i",{className:"far fa-image md_btn",onClick:function(t){return W("image")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Backticks",children:Object(j.jsx)("i",{className:"fas fa-terminal md_btn",onClick:function(t){return W("backticks")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Fenced Code",children:Object(j.jsx)("i",{className:"fas fa-code md_btn",onClick:function(t){return W("codeblock")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Tasklist",children:Object(j.jsx)("i",{className:"far fa-check-square md_btn",onClick:function(t){return W("tasklist")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Table",children:Object(j.jsx)("i",{className:"fas fa-table md_btn",onClick:function(t){return W("table")},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:"Strikethrough",children:Object(j.jsx)("i",{className:"fas fa-strikethrough md_btn",onClick:function(t){return W("strike")},style:O.buttonstyle})}),Object(j.jsxs)("span",{className:"input-div",children:[Object(j.jsx)("i",{className:"fas fa-angle-left fa-lg fnt_btn",onClick:function(t){return s(i-1)}}),Object(j.jsx)(F.a,{min:10,max:48,step:1,value:i,onChange:s,style:Object(T.a)(Object(T.a)({},u.inputNum),u.btn_dark),style:"vs-light"===O.theme?Object(T.a)(Object(T.a)({},u.inputNum),u.btn_light):Object(T.a)(Object(T.a)({},u.inputNum),u.btn_dark)}),Object(j.jsx)("i",{className:"fas fa-angle-right fa-lg fnt_btn",onClick:function(t){return s(i+1)}})]}),Object(j.jsxs)("div",{style:u.buttons,children:[Object(j.jsx)("span",{tooltip:p.description,children:Object(j.jsx)("i",{className:p.buttonClass,onClick:function(){x()},style:O.buttonstyle})}),Object(j.jsx)("span",{tooltip:O.description,children:Object(j.jsx)("i",{className:O.themeclass,onClick:function(t){N(O,k)},style:O.buttonstyle})})]})]}),Object(j.jsxs)("div",{className:"md-txtarea",children:[Object(j.jsx)("div",{className:"texteditor scrollbar",children:Object(j.jsx)("textarea",{name:"notebody",onChange:function(t){return function(t){w(t.target.value),Z({start:t.target.selectionStart,end:t.target.selectionEnd})}(t)},onPaste:function(t){return function(t){if(t.preventDefault(),t.clipboardData){var e,n=t.clipboardData?(t.originalEvent||t).clipboardData.getData("text/plain"):window.clipboardData?window.clipboardData.getData("Text"):"",o=t.clipboardData?(t.originalEvent||t).clipboardData.getData("text/html"):window.clipboardData?window.clipboardData.getData("Html"):"";if(o?(B.keep(["pre","code"]),e=B.turndown(o)):e=/<[a-z][\s\S]*>/i.test(n)?B.turndown(A()(n)):n,document.queryCommandSupported("insertText"))document.execCommand("insertText",!1,e);else{var a=document.processInputection().getRangeAt(0);a.deleteContents();var i=document.createTextNode(e);a.insertNode(i),a.selectNodeContents(i),a.collapse(!1);var s=window.processInputection();s.removeAllRanges(),s.addRange(a)}}}(t)},onKeyDown:function(t){return function(t){"Tab"===t.code?(W("tab"),t.preventDefault()):'"'===t.key?(W("doublequote"),t.preventDefault()):"("===t.key?(W("brackets"),t.preventDefault()):"{"===t.key?(W("curlybrackets"),t.preventDefault()):"["===t.key?(W("squarebrackets"),t.preventDefault()):"<"===t.key?(W("anglebrackets"),t.preventDefault()):"`"===t.key?(W("backticks"),t.preventDefault()):t.ctrlKey&&"KeyB"===t.code?W("bold"):t.ctrlKey&&"KeyI"===t.code?W("italic"):t.ctrlKey&&"KeyL"===t.code&&W("link")}(t)},"data-action":e.action,value:E,id:"notebody",ref:J,"data-action":e.action,selectionend:z.end,selectionstart:z.start,style:"vs-light"===O.theme?Object(T.a)(Object(T.a)({},u.textarea),u.light):Object(T.a)(Object(T.a)({},u.textarea),u.dark)})}),Object(j.jsx)("div",{className:"right-bottom-bar",children:Object(j.jsxs)("div",{className:"saveCancelBar",children:[Object(j.jsx)("span",{tooltip:"Save",flow:"right",children:Object(j.jsx)("i",{className:"far fa-save btn-save-cancel fa-2x",onClick:function(n){return function(n){e.notetitle=I,e.notebody=E,t.handleSaveNote(n,e)}(n)},"data-action":e.action})}),Object(j.jsx)("span",{tooltip:"Cancel",flow:"left",children:Object(j.jsx)("i",{className:"far fa-window-close btn-save-cancel fa-2x",onClick:function(n){return"updatenote"===e.action?document.getElementById(e.noteid).click():document.querySelectorAll(".note-list-item").length>0?document.querySelectorAll(".note-list-item")[0].click():t.handleClickHomeBtn()}})})]})})]})]}),r&&Object(j.jsx)(q,{note:{notebody:E,notetitle:I}})]})};var z=function(){return Object(j.jsx)("div",{className:"footer-bar"})},Z=n(45),W=n.n(Z),J=n(12),P=n(22),V=function(t){Object(f.a)(o,t);var e=Object(p.a)(o);function o(t){var n;return Object(u.a)(this,o),(n=e.call(this,t)).updateCodeSyntaxHighlighting=function(){document.querySelectorAll("pre code").forEach((function(t){W.a.highlightElement(t)}))},n.handleCopyCodeButtonClick=function(){if(navigator&&navigator.clipboard)n.addCopyButtons(navigator.clipboard);else{var t=document.createElement("script");t.src="https://cdnjs.cloudflare.com/ajax/libs/clipboard-polyfill/2.7.0/clipboard-polyfill.promise.js",t.integrity="sha256-waClS2re9NUbXRsryKoof+F9qc1gjjIhc2eT7ZbIv94=",t.crossOrigin="anonymous",t.onload=function(){this.addCopyButtons(clipboard)},document.body.appendChild(t)}},n.addCopyButtons=function(t){var e=document.querySelectorAll("pre code");0!==e.length&&e.forEach((function(e){var n=e.parentNode,o=n.previousElementSibling;if(!o||"button"!==o.type){var a=document.createElement("button");if(a.className="copy-code-button",a.setAttribute("id","copy-code-button"),a.type="button",a.innerText="Copy",a.addEventListener("click",(function(){t.writeText(e.innerText).then((function(){a.blur(),a.innerText="Copied!",setTimeout((function(){a.innerText="Copy"}),2e3)}),(function(t){a.innerText="Error"}))})),n.parentNode.classList.contains("highlight")){var i=n.parentNode;i.parentNode.insertBefore(a,i)}else n.parentNode.insertBefore(a,n)}}))},n.handleNoteListItemClick=function(t,e){n.setState({noteid:e.noteid,notetitle:e.title,notebody:e.body,activepage:"viewnote",action:""});var o=document.querySelectorAll(".note-list-item-clicked");o.length>0&&o.forEach((function(t){return t.classList.remove("note-list-item-clicked")})),document.getElementById(e.noteid).classList.add("note-list-item-clicked")},n.handleNoteListItemMouseOver=function(t,e){var n=document.querySelectorAll(".note-list-item-hover");n.length>0&&n.forEach((function(t){return t.classList.remove("note-list-item-hover")})),document.getElementById(e.noteid).classList.add("note-list-item-hover")},n.handleNoteListItemMouseOut=function(){var t=document.querySelectorAll(".note-list-item-hover");t.length>0&&t.forEach((function(t){return t.classList.remove("note-list-item-hover")}))},n.handleClickHomeBtn=function(t){fetch(L).then((function(t){return t.text()})).then((function(t){var e=t.split("\n",1)[0],o=t.split("\n");o.splice(0,1);var a=o.join("\n");n.setState({noteid:"00000000",notetitle:e,notebody:a,activepage:"viewnote",action:"homepage"})}))},n.handleSortNotes=function(t){var e=Object(d.a)(n.state.allnotes),o=event?event.target.value:t;switch(o){case"0":e.sort((function(t,e){var n=t.title.toUpperCase(),o=e.title.toUpperCase();return n==o?0:n>o?1:-1}));break;case"1":e.sort((function(t,e){var n=t.title.toUpperCase(),o=e.title.toUpperCase();return n==o?0:n>o?-1:1}));break;case"2":e.sort((function(t,e){return e.created_at-t.created_at}));break;case"3":e.sort((function(t,e){return t.created_at-e.created_at}));break;case"4":e.sort((function(t,e){return e.updated_at-t.updated_at}));break;case"5":e.sort((function(t,e){return t.updated_at-e.updated_at}))}n.setState({sortby:o,allnotes:e}),document.getElementById(e[0].noteid).click()},n.handleEditNoteBtn=function(t,e){if(n.setState({noteid:e.noteid,notetitle:e.notetitle,notebody:e.notebody,activepage:"editnote",action:t.target.dataset.action}),"addnote"===t.target.dataset.action){var o=document.querySelector(".note-list-item-clicked");o&&o.classList.remove("note-list-item-clicked")}},n.handleNoteEditor=function(t){n.setState({[t.target.name]:t.target.value})},n.state={noteid:"",notetitle:"",notebody:"",activepage:"viewnote",action:"",sortby:"4",allnotes:[]},n.handleNoteListItemClick=n.handleNoteListItemClick.bind(Object(b.a)(n)),n.handleClickHomeBtn=n.handleClickHomeBtn.bind(Object(b.a)(n)),n.handleNoteListItemMouseOver=n.handleNoteListItemMouseOver.bind(Object(b.a)(n)),n.handleEditNoteBtn=n.handleEditNoteBtn.bind(Object(b.a)(n)),n.handleSaveNote=n.handleSaveNote.bind(Object(b.a)(n)),n.handleDeleteNote=n.handleDeleteNote.bind(Object(b.a)(n)),n.handleDownloadNote=n.handleDownloadNote.bind(Object(b.a)(n)),n.handleSearchNotes=n.handleSearchNotes.bind(Object(b.a)(n)),n.handleIndexedDB=n.handleIndexedDB.bind(Object(b.a)(n)),n.handleCopyEvent=n.handleCopyEvent.bind(Object(b.a)(n)),n.handleSortNotes=n.handleSortNotes.bind(Object(b.a)(n)),n.updateCodeSyntaxHighlighting,n.addCopyButtons,n.handleCopyCodeButtonClick,n.handleNoteEditor=n.handleNoteEditor.bind(Object(b.a)(n)),n.handleNotesBackup=n.handleNotesBackup.bind(Object(b.a)(n)),n}return Object(h.a)(o,[{key:"componentDidMount",value:function(){var t=Object(r.a)(l.a.mark((function t(){var e;return l.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return t.next=2,this.handleIndexedDB("getall");case 2:0==(e=t.sent).length?this.handleClickHomeBtn():(this.setState({allnotes:e}),document.getElementById(e[0].noteid).click()),this.updateCodeSyntaxHighlighting(),this.handleCopyCodeButtonClick();case 6:case"end":return t.stop()}}),t,this)})));return function(){return t.apply(this,arguments)}}()},{key:"componentDidUpdate",value:function(){this.updateCodeSyntaxHighlighting(),this.handleCopyCodeButtonClick()}},{key:"handleIndexedDB",value:function(){var t=Object(r.a)(l.a.mark((function t(){var e,n,o,a,i,s,c,r,d=arguments;return l.a.wrap((function(t){for(;;)switch(t.prev=t.next){case 0:return e=d.length>0&&void 0!==d[0]?d[0]:"",n=d.length>1&&void 0!==d[1]?d[1]:"",t.next=4,Object(J.a)("notesdb",1,{upgrade:function(t){var e=t.createObjectStore("notes",{keyPath:"noteid",autoIncrement:!0});e.createIndex("created_at","created_at"),e.createIndex("noteid","noteid")}});case 4:if(o=t.sent,"addnote"!==e){t.next=8;break}return t.next=8,o.add("notes",n);case 8:if("getall"!==e){t.next=13;break}return t.next=11,o.getAll("notes");case 11:return a=t.sent,t.abrupt("return",a);case 13:if("getone"!==e){t.next=23;break}return t.next=16,Object(J.a)("notesdb",1);case 16:return i=t.sent,s=i.transaction("notes"),c=s.store.index("noteid"),t.next=21,c.get(n);case 21:return r=t.sent,t.abrupt("return",r);case 23:if("update"!==e){t.next=28;break}return t.next=26,Object(J.a)("notesdb",1);case 26:t.sent.put("notes",n);case 28:if("delete"!==e){t.next=33;break}return t.next=31,Object(J.a)("notesdb",1);case 31:t.sent.delete("notes",n.noteid);case 33:o.close();case 34:case"end":return t.stop()}}),t)})));return function(){return t.apply(this,arguments)}}()},{key:"handleDeleteNote",value:function(t,e){var n=this.state.allnotes.findIndex((function(t){return t.noteid===e.noteid}));if(this.setState((function(t){return{allnotes:t.allnotes.filter((function(t){if(t.noteid!==e.noteid)return t}))}})),this.handleIndexedDB("delete",e),this.state.allnotes.length-1==0)this.handleClickHomeBtn();else{var o=this.state.allnotes[n+1]?this.state.allnotes[n+1]:this.state.allnotes[n-1];this.handleNoteListItemClick("",o)}}},{key:"handleSaveNote",value:function(t,e){var n=B.turndown(A()(A()(e.notebody))),o=document.getElementById("notetitle").value;this.setState((function(t){var a=t.allnotes.map((function(t){return t.noteid===e.noteid&&(t.title=o,t.body=n,t.activepage="viewnote"),t}));return{noteid:e.noteid,notetitle:o,notebody:n,activepage:"viewnote",action:e.action,allnotes:a}})),"addnote"==e.action?(this.state.allnotes.push({noteid:e.noteid,notetitle:o,notebody:n,activepage:"viewnote",created_at:Date.now(),updated_at:Date.now(),action:e.action}),this.handleIndexedDB("addnote",{noteid:e.noteid,title:o,body:n,created_at:Date.now(),updated_at:Date.now()})):this.handleIndexedDB("update",{noteid:e.noteid,title:o,body:n,updated_at:Date.now()})}},{key:"handleCopyEvent",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";if(e)return navigator.clipboard.writeText(e).then((function(){})).catch((function(t){console.log("Something went wrong",t)}));if("undefined"!=typeof window.getSelection){var n=window.getSelection();if(n.rangeCount){for(var o=document.createElement("div"),a=0,i=n.rangeCount;a<i;++a)o.appendChild(n.getRangeAt(a).cloneContents());e=o.innerHTML}}else"undefined"!=typeof document.selection&&"Text"==document.selection.type&&(e=document.selection.createRange().htmlText);navigator.clipboard.writeText(B.turndown(e)).then((function(){})).catch((function(t){console.log("Something went wrong",t)}))}},{key:"handleSearchNotes",value:function(t){for(var e=document.querySelectorAll(".note-list-item"),n=t.target.value.toUpperCase(),o=[],a=0;a<e.length;a++){e[a].innerText.toUpperCase().indexOf(n)>-1?(e[a].style.display="",o.push(e[a])):e[a].style.display="none"}o.length>0&&o[0].click()}},{key:"handleDownloadNote",value:function(t){var e="".concat(t.notetitle.replace(/[^A-Z0-9]+/gi,"_")||"note",".md"),n=new Blob([t.notebody],{type:"text/plain;charset=utf-8"});Object(P.saveAs)(n,e)}},{key:"handleNotesBackup",value:function(){var t=n(335)();this.state.allnotes.map((function(e){var n="".concat(e.title.replace(/[^A-Z0-9]+/gi,"_")||"note",".md");t.file(n,e.body)})),t.generateAsync({type:"blob"}).then((function(t){Object(P.saveAs)(t,"notes_backup.zip")}))}},{key:"render",value:function(){var t,e,n=this,o=this.state.allnotes.map((function(t){return Object(j.jsx)(v,{note:t,handleClick:n.handleNoteListItemClick,handleMouseOver:n.handleNoteListItemMouseOver,handleMouseOut:n.handleNoteListItemMouseOut},t.noteid)}));return"viewnote"===this.state.activepage&&(e=Object(j.jsx)(g,{display:"homepage"!==this.state.action&&!0,notesData:{noteid:this.state.noteid,notetitle:this.state.notetitle,notebody:this.state.notebody,action:this.state.action},handleEditNoteBtn:this.handleEditNoteBtn,handleDeleteNote:this.handleDeleteNote,handleCopyEvent:this.handleCopyEvent,handleDownloadNote:this.handleDownloadNote}),t=Object(j.jsxs)(j.Fragment,{children:[Object(j.jsx)(I,{notesData:{noteid:this.state.noteid,notetitle:this.state.notetitle,notebody:this.state.notebody,action:this.state.action},handleCopyEvent:this.handleCopyEvent}),Object(j.jsx)(z,{})]})),"editnote"===this.state.activepage&&(e=Object(j.jsx)(g,{display:!1}),t=Object(j.jsx)(K,{editNoteData:{noteid:this.state.noteid,notetitle:this.state.notetitle,notebody:this.state.notebody,action:this.state.action},splitscreen:this.state.split,handleEditNoteBtn:this.handleEditNoteBtn,handleSaveNote:this.handleSaveNote,handleClickHomeBtn:this.handleClickHomeBtn,handleNoteEditor:this.handleNoteEditor})),Object(j.jsxs)("div",{className:"container",children:[Object(j.jsxs)("div",{className:"left",children:[Object(j.jsx)(m,{handleClickHomeBtn:this.handleClickHomeBtn,handleEditNoteBtn:this.handleEditNoteBtn,handleSearchNotes:this.handleSearchNotes}),Object(j.jsx)("ul",{className:"note-list",children:o}),Object(j.jsx)(x,{handleSortNotes:this.handleSortNotes,handleNotesBackup:this.handleNotesBackup})]}),Object(j.jsxs)("div",{className:"right",children:[e,t]})]})}}]),o}(o.Component),X=(n(343),document.getElementById("root"));s.a.render(Object(j.jsx)(o.StrictMode,{children:Object(j.jsx)(V,{})}),X)}},[[344,1,2]]]);
//# sourceMappingURL=main.069e0695.chunk.js.map