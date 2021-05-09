
var todoRoot = document.getElementById('todoroot')

var todoAdd = document.getElementById('todoadd')

var todoInput = document.getElementById('todoinput')

var loadingIndicator = document.getElementById('loading_indicator')

const relUrl = '/api/todo'

function toogleDisabled() {
    if(todoAdd.hasAttribute('disabled'))
        todoAdd.removeAttribute('disabled')
    else 
        todoAdd.setAttribute('disabled', true)
}

function addTodo(text){
    toogleDisabled()
    fetch(relUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({text})
    })
    .then(response => response.json())
    .then(item => {
        toogleDisabled()
        var elem = createTodoElement(item["id"], item["text"])
        todoRoot.appendChild(elem)
    })
    .catch(err => {
        toogleDisabled()
        alert("oops, it failed")
    })
}

function removeTodo(id){
    console.log("removeTodo", id)
    toogleDisabled()
    fetch(relUrl, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id})
    })
    .then(() => {
        console.log("success")
        toogleDisabled()
        var todo = document.getElementById(id)
        todo.remove()
    })
    .catch(err => {
        console.log("fail")
        toogleDisabled()
        console.log(err)
        alert("oops, it failed")
    })
}

function createTodoElement(id, text) {
    // also applies onClick event to remove toDo (removeTodo())

    html = `<div id="${id}" class="my-4 flex flex-row align-items rounded-md bg-green-100">
    <div class="p-2 w-4/5">${text}</div>
    <div class="p-2 w-1/5 flex flex-col justify-center"><button class="rounded-md">X</button></div>
</div>`

    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    template.content.firstChild.addEventListener('click', function(){removeTodo(id)})
    return template.content.firstChild;
}

todoAdd.addEventListener('click', function(){
    var v = todoInput.value
    console.log("v", v)
    todoInput.value = ""
    addTodo(v)
})


// fetch all ToDos
fetch(relUrl)
.then(resp => resp.json())
.then(data => data['Items']) // Basically a dynamodb 'scan' response, api simply forwards result
.then(items => {
    if(!items) return new Promise.reject()
    console.log(items)
    loadingIndicator.remove()
    items.forEach(element => {
        var elem = createTodoElement(element["id"].S, element["text"]?.S)
        todoRoot.appendChild(elem)
    });
    toogleDisabled()
})
.catch(err => {
    console.log(err)
    loadingIndicator.innerHTML = "Something went wrong"
})

