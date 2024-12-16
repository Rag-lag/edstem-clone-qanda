import { BACKEND_PORT } from './config.js';
// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl } from './helpers.js';

const fullPath='http://localhost:'+BACKEND_PORT
const pages=['login-registration','main']
const mainPages=['dashboard','profile','create-thread']
let isTokenSet=false;
let userId=localStorage.getItem('userId')
let token=localStorage.getItem('token')
let currThreadIndex=0;
let loading = false;
let allThreadList=new Set();

// Fn to show custom alert pop up when something goes wrong
const alertPopUp=(code,text,mssg)=>{
    document.getElementById("alert-pop-up").classList.remove('hidden');
    let errorMssg=`ERROR-${code}: ${text}`;
    document.getElementById("alert-title").textContent=errorMssg;
    document.getElementById("alert-mssg").textContent=mssg;
}

// Fn to set all values to default of the login and registration screen aka home scren after user logs out 
const refreshHome=()=>{
    document.getElementById('loginEmail').value='';
    document.getElementById('loginPass').value='';
    document.getElementById('regisEmail').value='';
    document.getElementById('regisPass').value='';
    document.getElementById('regisName').value='';
    document.getElementById('regisCnfPass').value='';
}

// Below are indivisual API call fn for PUT GET DELETE and and for login/registration
// Made sperate for each as some require token some dont need a body, to not have crazy if else block in the fn
const apiGetCall=(path,token)=>{
    const headers={
        'Authorization':`Bearer ${token}`,
        'Content-type': 'application/json',
    }
    return new Promise((resolve,reject)=>{
        const result=fetch(fullPath + path, {
            method: 'GET',
            headers: headers,
          });
          result.then((response) => {
            const json=response.json();
            json.then((data)=>{
                if (data.error) {
                    alertPopUp(response.status,response.statusText,data.error);
                } else {
                    resolve(data);
                }
            });      
          });
    });
}

const apiPutCall=(path,body,token)=>{
    const headers={
        'Authorization':`Bearer ${token}`,
        'Content-type': 'application/json',
    }
    return new Promise((resolve,reject)=>{
        const result=fetch(fullPath + path, {
            method: 'PUT',
            headers: headers,
            body:body,
          });
          result.then((response) => {
            const json=response.json();
            json.then((data)=>{
                if (data.error) {
                    alertPopUp(response.status,response.statusText,data.error);
                } else {
                    resolve(data);
                }
            });      
          });
    });
}

const apiDeleteCall=(path,body,token)=>{
    const headers={
        'Authorization':`Bearer ${token}`,
        'Content-type': 'application/json',
    }
    return new Promise((resolve,reject)=>{
        const result=fetch(fullPath + path, {
            method: 'DELETE',
            headers: headers,
            body:body,
          });
          result.then((response) => {
            const json=response.json();
            json.then((data)=>{
                if (data.error) {
                    alertPopUp(response.status,response.statusText,data.error);

                } else {
                    resolve(data);
                }
            });      
          });
    });
}

const apiCall=(path,body,method)=>{
    let headers={};
    if(token){
        headers={
            'Authorization':`Bearer ${token}`,
            'Content-type': 'application/json',
        }
    }
    else{
        headers={
            'Content-type': 'application/json',
        }
    }
    return new Promise((resolve,reject)=>{
        const result=fetch(fullPath + path, {
            method: method,
            headers: headers,
            body: body
          });
          result.then((response) => {
            const json=response.json();
            json.then((data)=>{
                if (data.error) {
                    alertPopUp(response.status,response.statusText,data.error);
                } else {
                    resolve(data);
                }
            });      
          });
    });
    
}

const getTimeAgo=(dateString) =>{
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minute(s) ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour(s) ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day(s) ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks} week(s) ago`;
}

// This fn recurrsively gets info regaridng  all the threads a particular user has created. Just 2 fn like this in the entire code
const loadUserThreads = (uId, threadsList) => {
    let startIndex = 0;
    const threadsCount = 5;
    
    const fetchThreads = () => {
        apiGetCall(`/threads?start=${startIndex}`, token).then(threadIds => {
            if (threadIds.length === 0) return; // Stop if no more threads
            
            const threadPromises = threadIds.map(threadId => {
                return apiGetCall(`/thread?id=${threadId}`, token);
            });

            Promise.all(threadPromises).then(threads => {
                threads.forEach(thread => {
                    if(thread.creatorId===uId){
                        apiGetCall(`/comments?threadId=${thread.id}`,token).then(data=>{
                            const threadItem = document.createElement('li');
                            threadItem.classList.add("list-group-item")
                            const threadTitle=document.createElement("h4");
                            const threadBody=document.createElement("p");
                            const threadFooter=document.createElement("p");
                            threadTitle.textContent=thread.title;
                            threadBody.textContent=thread.content;
                            threadFooter.textContent=`Likes: ${thread.likes.length} | Comments: ${data.length}`
                            threadItem.appendChild(threadTitle);
                            threadItem.appendChild(threadBody);
                            threadItem.appendChild(threadFooter);
                            threadsList.appendChild(threadItem);
                        });
                    }
                });
                startIndex += threadsCount; // Increment start index for the next call
                fetchThreads(); // Fetch next set of threads
            });
        });
    };
    // Start fetching threads
    fetchThreads(); 
};

// This fn loads user profile both self and when you access somebody elses. isselfProfiel tells whether we are acessing out own profile or not
const loadProfile=(isSelfProfile,uId,isCurUserAdmin)=>{
    if(isSelfProfile){
        apiGetCall(`/user?userId=${uId}`,token).then(data=>{
            let currUser=localStorage.getItem('userId');
            let emailId=data.email;
            let name =data.name;
            let img=data.image;
            let isAdmin=data.admin;
            let ownUserInfo=document.getElementById('own-user-info');
            let profileDisplay=document.createElement('img')
            profileDisplay.classList.add("profile-pic-big");
            profileDisplay.src=img;
            let nameDisplay=document.createElement('p')
            nameDisplay.textContent="Name: "+name;
            let emailDisplay=document.createElement('p')
            emailDisplay.textContent="Email-ID: "+emailId;
            let adminDisplay=document.createElement('p')
            adminDisplay.textContent=isAdmin?'You are an Admin':'Sorry kiddo u just a normie user';
            while(ownUserInfo.firstChild){
                ownUserInfo.removeChild(ownUserInfo.firstChild);
            }
            ownUserInfo.appendChild(profileDisplay);
            ownUserInfo.appendChild(nameDisplay);
            ownUserInfo.appendChild(emailDisplay);
            ownUserInfo.appendChild(adminDisplay);

            const ownthreadsList = document.getElementById('own-user-threads');
            while(ownthreadsList.firstChild){
                ownthreadsList.removeChild(ownthreadsList.firstChild);
            }
            loadUserThreads(parseInt(uId), ownthreadsList);
        });
    }
    else{
        apiGetCall(`/user?userId=${uId}`,token).then(data=>{
            let currUser=localStorage.getItem('userId');
            let emailId=data.email;
            let name =data.name;
            let img=data.image;
            let isAdmin=data.admin;
            document.getElementById('others-profile').classList.remove('hidden');
            document.getElementById('main').classList.add('hidden');
            let otherUserInfo=document.getElementById('other-user-info');
            let profileDisplay=document.createElement('img');
            profileDisplay.classList.add("profile-pic-big");
            profileDisplay.src=img;
            let nameDisplay=document.createElement('p')
            nameDisplay.textContent="Name: "+name;
            let emailDisplay=document.createElement('p')
            emailDisplay.textContent="Email-ID: "+emailId;
            let adminDisplay=document.createElement('p')
            adminDisplay.textContent=isAdmin?'This user is an admin':'This user is not an admin';

            while(otherUserInfo.firstChild){
                otherUserInfo.removeChild(otherUserInfo.firstChild);
            }
            otherUserInfo.appendChild(profileDisplay);
            otherUserInfo.appendChild(nameDisplay);
            otherUserInfo.appendChild(emailDisplay);
            otherUserInfo.appendChild(adminDisplay);

            if(isCurUserAdmin){
                let labelAdmin=document.createElement('label');
                labelAdmin.for=uId;
                labelAdmin.textContent="User Status:"
                let selectAdmin=document.createElement('select');
                selectAdmin.id=uId;
                let option1Admin=document.createElement('option');
                option1Admin.value=isAdmin;
                option1Admin.textContent=isAdmin?"Admin":"User";
                option1Admin.selected='selected';
                let option2Admin=document.createElement('option');
                option2Admin.value=!isAdmin;
                option2Admin.textContent=!isAdmin?"Admin":"User";
                selectAdmin.appendChild(option1Admin);
                selectAdmin.appendChild(option2Admin);
                otherUserInfo.appendChild(labelAdmin);
                otherUserInfo.appendChild(selectAdmin);
                let updateAdmin=document.createElement("div")
                updateAdmin.classList.add('btn');
                updateAdmin.classList.add('btn-primary');
                updateAdmin.textContent="Update";
                updateAdmin.addEventListener('click',()=>{
                    const body=JSON.stringify({
                        'userId':uId,
                        'turnon':selectAdmin.value==="true"?true:false,
                    });
                    apiPutCall('/user/admin',body,token);
                });
                otherUserInfo.appendChild(updateAdmin);
            }

            const threadsList = document.getElementById('other-user-threads');
            while(threadsList.firstChild){
                threadsList.removeChild(threadsList.firstChild);
            }
            loadUserThreads(uId, threadsList);    
        })
    }
}

// This fn is also recurssive and get all the comment and makes sure they are nested properly under correct parent. This one took me some time
const loadComments = (comments, commentSection, threadView, isLocked) => {
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const commentMap = {};
    comments.forEach(comment => {
        if (!commentMap[comment.parentCommentId]) {
            commentMap[comment.parentCommentId] = [];
        }
        commentMap[comment.parentCommentId].push(comment);
    });

    // Function to recursively render comments and their children
    const renderComments = (parentId, parentElement,indentLevel = 0) => {
        const parentComments = commentMap[parentId] || [];

        parentComments.forEach(comment => {
            const comm = document.createElement('div');
            comm.classList.add('comment');
            comm.style.marginLeft = `${20}px`;
            comm.style.width=indentLevel===0?'1000px' : '99%';

            const userProfile = document.createElement('span');
            const userImg = document.createElement('img');
            userImg.classList.add('profile-pic-small');
            const userName = document.createElement('p');

            const commentBody = document.createElement('p');
            const commentFooter = document.createElement('div');
            const commentBtn = document.createElement('div');
            const commentReply = document.createElement('span');
            const commentEdit = document.createElement('span');
            const commentLikeBtn = document.createElement('span');

            commentReply.textContent = "Reply";
            commentReply.classList.add("btn", "btn-info");

            commentEdit.textContent = "Edit";
            commentEdit.classList.add("btn", "btn-primary");

            commentLikeBtn.textContent = "Like";
            commentLikeBtn.classList.add("btn", "btn-danger");

            comm.id = `${comment.id}`;

            apiGetCall(`/user?userId=${comment.creatorId}`,token).then(data=>{
                userName.textContent=data.name;
                userImg.src=data.image;
                if(comment.parentCommentId){
                    commentBody.textContent=comment.content;
                }
                else{
                    commentBody.textContent=comment.content;
                }
                if(!isLocked){
                    commentReply.addEventListener('click',()=>{
                        document.getElementById('reply-comment').classList.remove("hidden");
                        document.getElementById('parentCommId').textContent=comment.id;
                        document.getElementById('threadId').textContent=comment.threadId;
                    });
                }
    
                commentEdit.addEventListener('click',()=>{
                    document.getElementById('edit-comment').classList.remove("hidden");
                    document.getElementById('commentId').textContent=comment.id;
                    document.getElementById('threadId').textContent=comment.threadId;
                    document.getElementById('edit-comment-body').value=comment.content;
    
                })
                if(comment.likes.includes(parseInt(userId))){
                    commentLikeBtn.textContent="Unlike";
                    commentLikeBtn.classList.add("btn-secondary");
                    commentLikeBtn.classList.remove("btn-danger");        
                }
    
                commentLikeBtn.addEventListener('click',()=>{
                    let id=parseInt(comment.id);
                    let turnon=commentLikeBtn.textContent==='Like'?true:false;
                    if(commentLikeBtn.textContent==='Like'){
                        commentLikeBtn.textContent="Unlike";
                        commentLikeBtn.classList.add("btn-secondary");
                        commentLikeBtn.classList.remove("btn-danger");
                    }
                    else{
                        commentLikeBtn.textContent="Like";
                        commentLikeBtn.classList.remove("btn-secondary");
                        commentLikeBtn.classList.add("btn-danger");
                    }
                    const body=JSON.stringify({
                        id,
                        turnon,
                    }); 
                    apiPutCall('/comment/like',body,token).then(data=>{
                        loadThread(comment.threadId);
                    })
    
                });
    
                let time=getTimeAgo(comment.createdAt);
                commentFooter.textContent=`Likes-${comment.likes.length} | ${time}`;
                userProfile.appendChild(userImg);
                userProfile.appendChild(userName);
    
                apiGetCall(`/user?userId=${userId}`,token).then(data=>{
                    commentBtn.appendChild(commentReply);
                    commentBtn.appendChild(commentLikeBtn);
    
                    if(userId==comment.creatorId||data.admin){
                        commentBtn.appendChild(commentEdit);
                    }
                    userProfile.addEventListener('click',()=>{
                        loadProfile(false,comment.creatorId,data.admin);
                    });
                    comm.appendChild(userProfile);
                    comm.appendChild(commentBody);
                    comm.appendChild(commentFooter);
                    comm.appendChild(commentBtn);
                    commentSection.appendChild(comm);
                    threadView.appendChild(commentSection);
                    parentElement.appendChild(comm);
                    // Recursively render child comments (replies)
                    renderComments(comment.id,comm ,indentLevel + 1);
                });
            });
        });
    };
    
    // Start rendering from root comments (those with no parent)
    renderComments(null,commentSection);
};

// this fn loads a particualr thread from sidebar which is clicked on. load all the thread interaction threa ddetails and comments
const loadThread=(threadId)=>{
    
    const threadView=document.getElementById('thread-view');
    if(threadId===0){
        while(threadView.firstChild){
            threadView.removeChild(threadView.firstChild);
        }
    }
    else{
    const commentInput=document.createElement('div');
    const commentTypeAr=document.createElement('textarea');
    commentTypeAr.classList.add('form-control')
    commentTypeAr.id='comment-type';
    const commentBtn=document.createElement('span');
    commentBtn.textContent="Comment";
    commentBtn.classList.add('btn-success');
    commentBtn.classList.add('btn');
    const commentSection=document.createElement('div');
    const threadTitle=document.createElement('h2');
    const threadContent=document.createElement('p');
    const threadLikes=document.createElement('p');
    const threadInteractions=document.createElement('div');
    const threadEdit=document.createElement('span');
    threadEdit.classList.add('btn');
    threadEdit.classList.add('btn-primary');
    threadEdit.textContent="Edit";
    const threadDelete=document.createElement('span');
    threadDelete.classList.add('btn');
    threadDelete.classList.add('btn-warning');
    threadDelete.textContent="Delete";
    const threadLike=document.createElement('span');
    threadLike.classList.add('btn');
    threadLike.classList.add('btn-secondary');
    threadLike.textContent="Like";
    const threadWatch=document.createElement('span');
    threadWatch.classList.add('btn');
    threadWatch.classList.add('btn-info');
    threadWatch.textContent="Watch";

    while(threadView.firstChild){
        threadView.removeChild(threadView.firstChild);
    }
    apiGetCall(`/thread?id=${threadId}`,token).then((data)=>{
        let titleContent=data.title;
        let bodyContent=data.content;
        let likes=data.likes;
        let watchees=data.watchees
        let numLikes=likes.length;
        let isPublic=data.isPublic;
        let isLock=data.lock;
        let creatorId=data.creatorId;
        apiGetCall(`/user?userId=${userId}`,token).then(data=>{
            if(creatorId==userId || data.admin){
                threadEdit.addEventListener('click',()=>{
                    document.getElementById('edit-thread-page').classList.remove('hidden');
                    document.getElementById('main').classList.add('hidden');
                    document.getElementById("edit-content-title").value=titleContent;
                    document.getElementById("edit-content-body").value=bodyContent;
                    document.getElementById("edit-private-thread-check").checked=isPublic;
                    document.getElementById("edit-lock-thread-check").checked=isLock;
                    document.getElementById("thread-id").textContent=threadId
                })
                threadDelete.addEventListener('click',()=>{
                    const body=JSON.stringify({
                        "id":threadId,
                    });
                    apiDeleteCall('/thread',body,token).then(data=>{
                        allThreadList.delete(threadId);
                        updateSideBarUI(allThreadList,true);
                        loadThread(allThreadList.values().next().value); 
                    })
                })
                threadInteractions.appendChild(threadEdit);
                threadInteractions.appendChild(threadDelete);
            }
        });
        
        if(likes.includes(parseInt(userId))){
            threadLike.textContent="Liked";
            threadLike.classList.remove('btn-secondary');
            threadLike.classList.add('btn-danger');
        }
        if(!isLock){
            threadLike.addEventListener('click',()=>{
                if(threadLike.textContent==='Like'){
                    threadLike.textContent="Liked";
                    threadLike.classList.remove('btn-secondary');
                    threadLike.classList.add('btn-danger');
                    let turnon=true;
                    const body=JSON.stringify({
                        "id":threadId,
                        "turnon":turnon,
                    }); 
                    apiPutCall('/thread/like',body,token).then(data=>{
                        updateSideBarUI(allThreadList,true);
                        loadThread(threadId);
                    })

                }
                else{
                    threadLike.classList.remove('btn-danger');
                    threadLike.classList.add('btn-secondary');
                    threadLike.textContent="Like";
                    let turnon=false;
                    const body=JSON.stringify({
                        "id":threadId,
                        "turnon":turnon,
                    }); 
                    apiPutCall('/thread/like',body,token).then(data=>{
                        updateSideBarUI(allThreadList,true);
                        loadThread(threadId);
                    })
                }
            })
        }
        threadInteractions.appendChild(threadLike);
        if(watchees.includes(parseInt(userId))){
            threadWatch.textContent="Watching";
            threadWatch.classList.remove('btn-info');
            threadWatch.classList.add('btn-dark');
        }
        threadWatch.addEventListener('click',()=>{
            if(threadWatch.textContent==='Watch'){
                threadWatch.textContent="Watching";
                threadWatch.classList.remove('btn-info');
                threadWatch.classList.add('btn-dark');
                let turnon=true;
                const body=JSON.stringify({
                    "id":threadId,
                    "turnon":turnon,
                }); 
                apiPutCall('/thread/watch',body,token)
            }
            else{
                threadWatch.classList.remove('btn-dark');
                threadWatch.classList.add('btn-info');
                threadWatch.textContent="Watch";
                let turnon=false;
                const body=JSON.stringify({
                    "id":threadId,
                    "turnon":turnon,
                }); 
                apiPutCall('/thread/watch',body,token)
            }
        });
        threadInteractions.appendChild(threadWatch);
        threadTitle.textContent=titleContent;
        threadContent.textContent=bodyContent;
        threadLikes.textContent=`❤️-${numLikes}`;
        threadView.appendChild(threadInteractions)
        threadView.appendChild(threadTitle);
        threadView.appendChild(threadContent);
        threadView.appendChild(threadLikes);
        apiGetCall(`/comments?threadId=${threadId}`,token).then((data)=>{
            if(data.length!==0){
                loadComments(data,commentSection,threadView,isLock);
            }
            if(!isLock){
                commentInput.appendChild(commentTypeAr);
                commentInput.appendChild(commentBtn);
                commentBtn.addEventListener('click',()=>{
                    if(commentTypeAr.value){
                        let content=commentTypeAr.value;
                        let parentCommentId=null;
                        const body=JSON.stringify({
                            content,
                            threadId,
                            parentCommentId,
                        });
                        apiCall('/comment',body,'POST').then(data=>{
                            loadThread(threadId);
                        });
                    }
                    else{
                        alertPopUp("Empty","Empty Comment","Can't post an empty comment bro");
                    }  
                });
                threadView.appendChild(commentInput);
            } 
        });        
    });
}
}

// this fn is to update the sidebar ui in case any like i made to thread so that it reflects instantly also it loads the elements of the sidebar
const updateSideBarUI=(threadIds,freshLoad)=>{
    const sidebarList = document.getElementById('sidebar-list');
    if(freshLoad){
        while (sidebarList.firstChild) {
            sidebarList.removeChild(sidebarList.firstChild);
        }
    }
    threadIds.forEach(threadId => {
        const listItem = document.createElement('li');
        listItem.classList.add('list-group-item');
        listItem.classList.add("individual-threads")
        const title = document.createElement('div');
        title.classList.add("individual-thread-title")
        const info = document.createElement('div');
        
        apiGetCall(`/thread?id=${threadId}`,token).then((data)=>{
            let creatorId=data.creatorId;
            let titleContent=data.title;
            let createdOn=data.createdAt;
            let numLikes=data.likes.length;
            let createdOnString=String(new Date(createdOn));
            apiGetCall(`/user?userId=${creatorId}`,token).then(data=>{

                title.textContent = titleContent;
                info.textContent = `By ${data.name} on ${createdOnString.slice(0,21)} | ${numLikes} Likes`;
                listItem.appendChild(title);
                listItem.appendChild(info);
                listItem.addEventListener('click',()=>{
                    loadThread(threadId,threadIds);
                })
                sidebarList.appendChild(listItem);
            })
        });
      
    });
}

// this fn make the api call to get thread ids and pass it ot updateSideBarUI
const loadSideBar=(loadFresh)=>{
    if (loading) return; 
    loading = true;
    if(loadFresh){
        allThreadList=new Set();
        currThreadIndex = 0;
    }
        let threadList=[];
        apiGetCall(`/threads?start=${currThreadIndex}`,token).then((data)=>{
            if (data.length === 0) {
                loading = false;
                return;
            }
            data.forEach(item => allThreadList.add(item));
            currThreadIndex += 5;
            threadList=data
            threadList.forEach(item => allThreadList.add(item))
            updateSideBarUI(threadList,loadFresh);  
            loading = false;
        });
}

// this fn is to load different section of the main page i.e., dashboard, user profile and create thread
const loadSection=(page)=>{
    if(page==='profile'){
        loadProfile(true,userId);
    }

    for (let p of mainPages){
        if(page===p){
            document.getElementById(`${page}`).classList.remove('hidden');
            localStorage.setItem('currSection',page)
        }
        else{
            document.getElementById(`${p}`).classList.add('hidden');
        }
    }
}

// this fn redirects the user form main to home and home to main after login/register and log-off respectively 
const goToPage=(page)=>{
    if(page==='main'){
        // dont wann keep loading sidebar eachtime i visit dashboard so loaded it when we login
        loadSideBar(true);
        loadThread(0); 
    }
    for (let p of pages){
        if (page===p){
            document.getElementById(`${page}`).classList.remove('hidden')
        }
        else{
            document.getElementById(`${p}`).classList.add('hidden')
        }
    }
}
const validateEmail=(email)=> {
    // Regular expression for basic email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// this fn set all local storage ans sessioin variable to default value;
const logOff=()=>{
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('currSection');
    localStorage.removeItem('startIndex');
    localStorage.removeItem('currThread');
    isTokenSet=false;
    currThreadIndex=0;
    allThreadList=new Set();
}

// If the there already exist a token in locall let the user be logged in. prevent logging out if refreshed
if (token){
    goToPage('main');
    const section=localStorage.getItem('currSection');
    loadSection(section);
}

// All event listner and values tht will be user are below. added event listner to btns and to side bar.
// sidebar event listner is scroll so that Infinite Scroll is possible
    
    document.getElementById("close-alert").addEventListener('click',()=>{
        document.getElementById("alert-mssg").textContent="";
        document.getElementById("alert-pop-up").classList.add('hidden');
    });
    const loginToRegis=document.getElementById("login-to-regis");
    loginToRegis.removeEventListener('click',()=>{})

    loginToRegis.addEventListener('click',()=>{
        const loginPage=document.getElementById("login");
        const regisPage=document.getElementById("registration");
        loginPage.classList.add('hidden');
        regisPage.classList.remove('hidden');
    });
    const regisToLogin=document.getElementById("regis-to-login");
    regisToLogin.removeEventListener('click',()=>{})

    regisToLogin.addEventListener('click',()=>{
        const loginPage=document.getElementById("login");
        const regisPage=document.getElementById("registration");
        loginPage.classList.remove('hidden');
        regisPage.classList.add('hidden');
    });
    document.getElementById('login-submit').addEventListener('click',()=>{
        const email=document.getElementById('loginEmail').value;
        if(validateEmail(email)){
            const password=document.getElementById('loginPass').value;
            const body=JSON.stringify({
                email,
                password,
            });
            apiCall('/auth/login',body,'POST').then((data)=>{
                localStorage.setItem('password',password)
                localStorage.setItem('userId',data.userId)
                localStorage.setItem('token',data.token)
                token=localStorage.getItem('token')
                userId=localStorage.getItem('userId')
                isTokenSet=true
                goToPage('main');
                loadSection('dashboard');
            });
        }
        else{
            alertPopUp("Invalid","Invalid Email","Yo enter valid email bruh")
        }
        
    });
    document.getElementById('regis-submit').addEventListener('click',(event)=>{
        const email=document.getElementById('regisEmail').value;
        if(validateEmail(email)){
            const password=document.getElementById('regisPass').value;
            const name=document.getElementById('regisName').value;
            const cnfPass=document.getElementById('regisCnfPass').value;
            if(cnfPass===password){
                const body=JSON.stringify({
                    email,
                    password,
                    name,
                });
                apiCall('/auth/register',body,'POST').then((data)=>{
                    localStorage.setItem('password',password)
                    localStorage.setItem('userId',data.userId)
                    localStorage.setItem('token',data.token)
                    token=localStorage.getItem('token')
                    userId=localStorage.getItem('userId')
                    isTokenSet=true
                    goToPage('main');
                    loadSection('dashboard');
                });
            }
            else{
                alertPopUp("Match","Passwords","Broo passowrds don't match`")
            }
        }
        else{
            alertPopUp("Invalid","Invalid Email","Yo enter valid email bruh")
        }
    });
    document.getElementById('dashboard-btn').addEventListener('click',()=>{loadSection('dashboard')});
    document.getElementById('profile-btn').addEventListener('click',()=>{loadSection('profile')});
    document.getElementById('create-thread-btn').addEventListener('click',()=>{loadSection('create-thread')});
    document.getElementById('log-out').addEventListener('click',()=>{
        logOff();
        goToPage('login-registration');
        refreshHome();
    });

    document.getElementById("post-thread-btn").addEventListener("click",()=>{
        let title=document.getElementById('content-title').value;
        let content=document.getElementById('content-body').value;
        let isPublic=document.getElementById('private-thread-check').checked?false:true;
        const body=JSON.stringify({
            title,
            isPublic,
            content,
        });
        apiCall('/thread',body,'POST').then((data)=>{
            localStorage.setItem('currThread',data.id)
            document.getElementById('content-title').value='';
            document.getElementById('content-body').value='';
            document.getElementById('private-thread-check').checked=false;
            loadSection('dashboard');
            currThreadIndex=0;
            loadSideBar(true);
            loadThread(data.id);
        });
    });

    // Found a logic for this  on:https://webdesign.tutsplus.com/how-to-implement-infinite-scrolling-with-javascript--cms-37055t 
    // Implementation is complete mine
    document.getElementById('db-sidebar').addEventListener('scroll', function() {
        const sidebar = this;
        // Check if the user has scrolled near the bottom
        if (sidebar.scrollTop + sidebar.clientHeight >= sidebar.scrollHeight - 50) {
            loadSideBar(false); // Load more threads
        }
    });
    document.getElementById("discard-edit-thread-btn").addEventListener('click',()=>{
        document.getElementById('edit-thread-page').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
    })
    document.getElementById('edit-thread-btn').addEventListener('click',()=>{
        const title=document.getElementById("edit-content-title").value;
        const content=document.getElementById("edit-content-body").value;
        const isPublic=document.getElementById("edit-private-thread-check").checked?false:true;
        const lock=document.getElementById("edit-lock-thread-check").checked;
        const id=document.getElementById("thread-id").textContent;
        const body=JSON.stringify({
            id,
            title,
            isPublic,
            lock,
            content,
        });
        apiPutCall("/thread",body,token).then(data=>{
            document.getElementById('edit-thread-page').classList.add('hidden');
            document.getElementById('main').classList.remove('hidden');
            updateSideBarUI(allThreadList,true);
            loadThread(id);
        })
    });
    document.getElementById('close-reply-comment').addEventListener('click',()=>{
        document.getElementById('reply-comment').classList.add("hidden");
        document.getElementById('parentCommId').textContent='';
        document.getElementById('threadId').textContent='';
        document.getElementById('reply-comment-body').value="";
    });
    document.getElementById('reply-comment-btn').addEventListener('click',()=>{
            let content=document.getElementById('reply-comment-body').value;
            let threadId=document.getElementById('threadId').textContent;
            let parentCommentId='';
            if(document.getElementById('parentCommId').textContent===''||document.getElementById('parentCommId').textContent===null){
                parentCommentId=null;
            }
            else{
                parentCommentId=document.getElementById('parentCommId').textContent
            }
            const body=JSON.stringify({
                content,
                threadId,
                parentCommentId,
            });
            apiCall('/comment',body,'POST').then(data=>{
                document.getElementById('reply-comment').classList.add("hidden");
                document.getElementById('parentCommId').textContent='';
                document.getElementById('reply-comment-body').value="";
                loadThread(threadId);
            });
    });
    document.getElementById('close-edit-comment').addEventListener('click',()=>{
        document.getElementById('edit-comment').classList.add("hidden");
        document.getElementById('commentId').textContent="";
        document.getElementById('threadId').textContent="";
        document.getElementById('edit-comment-body').value="";
    });
    document.getElementById('edit-comment-btn').addEventListener('click',()=>{
            let content=document.getElementById('edit-comment-body').value;
            let id=document.getElementById('commentId').textContent;
            let threadId=document.getElementById('threadId').textContent;
            const body=JSON.stringify({
                id,
                content,
            });
            apiPutCall('/comment',body,token).then(data=>{
                document.getElementById('edit-comment').classList.add("hidden");
                document.getElementById('commentId').textContent='';
    
                loadThread(threadId);
            });
    });
    document.getElementById('close-others-profile').addEventListener('click',()=>{
        document.getElementById('others-profile').classList.add('hidden');
        document.getElementById('main').classList.remove('hidden');
    });
    document.getElementById('update-own-profile').addEventListener('click',()=>{
        document.getElementById('update-own-profile-modal').classList.remove('hidden');  
    });
    document.getElementById('close-update-own-profile').addEventListener('click',()=>{
        document.getElementById('update-own-profile-modal').classList.add("hidden");
        document.getElementById('updateEmail').value='';
        document.getElementById('updateName').value='';
        document.getElementById('updatePassword').value="";
    });
    document.getElementById('update-own-profile-btn').addEventListener('click',()=>{
        let email=document.getElementById('updateEmail').value;
        let name=document.getElementById('updateName').value;
        let password=document.getElementById('updatePassword').value;
        let image=document.getElementById('updateImage').files[0];
        let body={};
        if(image){
            fileToDataUrl(image).then(data=>{
                if(email){
                    body["email"]=email;
                }
                if(password){
                    body["password"]=password;
                }
                if(name){
                    body["name"]=name;
                }
                body["image"]=data;
                apiPutCall('/user',JSON.stringify(body),token).then(data=>{
                    document.getElementById('update-own-profile-modal').classList.add("hidden");
                    document.getElementById('updateEmail').value='';
                    document.getElementById('updateName').value='';
                    document.getElementById('updatePassword').value="";
                    document.getElementById('updateImage').value="";
                    loadProfile(true,userId);
                })
            })
        }
        else{
            if(email){
                body["email"]=email;
            }
            if(password){
                body["password"]=password;
            }
            if(name){
                body["name"]=name;
            }
            apiPutCall('/user',JSON.stringify(body),token).then(data=>{
                document.getElementById('update-own-profile-modal').classList.add("hidden");
                document.getElementById('updateEmail').value='';
                document.getElementById('updateName').value='';
                document.getElementById('updatePassword').value="";
                document.getElementById('updateImage').value="";
                loadProfile(true,userId);
            })
        }
        


    })