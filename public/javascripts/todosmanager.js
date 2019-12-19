// on load, the ui needs to display all todos
  // so the ui must have access to all todos
    // ui interactions with todos are going to be managed through the todos object
      // so todos object must have all todos prior to display
$(function() {

  (function() {
    // registers all Handlebars partials

    $("[data-type='partial']").each(function(i) {
      let name = $(this).attr("id");
      let html = $(this).html();
      Handlebars.registerPartial(name, html);
    });
  })();

  const sortByStatus = (a, b) => {
    if ( a.completed && !b.completed ) {
      return 1;
    } else if ( !a.completed && b.completed ) {
      return -1;
    } else {
      return 0;
    }
  };

  /*///////////////////////////////////////////////////////////////////////////////////////
   T H I S   I S   T H E   TODOS   O B J E C T

  ///////////////////////////////////////////////////////////////////////////////////////*/
  




  let todoManager = {
    todos: null,

    displayObject: {
      todos: null,
      current_section: {},
      selected: null
    },

    organizeByStatus: function(todos) {
      return todos.sort(sortByStatus);
    },

    allTodosObject: function() {

      this.displayObject.selected = this.organizeByStatus(this.todos); // will need to implement a method to organize this arr with completed todos being thrown to the bottom.
      this.displayObject.current_section.title = "All Todos";
      this.displayObject.current_section.data  = this.displayObject.selected.length;
      
      return this.displayObject;
    },

    todosByDateObject: function() {

    },

    sendDisplay: function(group) {
      if (group = "All Todos") {
        return this.allTodosObject();
      }
    },

    assignTodos: function(todos) {
      todos.forEach(function(todo) {
        if(!todo.month || !todo.year) {
          todo.due_date = "No Due Date";
        } else {
          todo.due_date = todo.month + "/" + todo.year.slice(2);
        }
      });
      this.todos = todos;
    },

    getTodoById: function(id) {
      return this.todos.find(todo => todo.id === id);
    },

  };

  /*///////////////////////////////////////////////////////////////////////////////////////
   T H I S   I S   T H E   UI   O B J E C T

  ///////////////////////////////////////////////////////////////////////////////////////*/

  let ui = {

    $mainTemplate: Handlebars.compile($("#main_template").html()),

    toggleModal: function(clearForm=false) {
      if (clearForm) {
        app.editing = false;
        $("#form_modal form")[0].reset()
      };
      $("div.modal").fadeToggle(300);
    },

    populateModal: function(data) {
      Object.keys(data).forEach(function(k) {
        if(data[k]) {
          $(`#form_modal *[name='${k}']`).val(data[k]);
        }
      });
      app.editing = true;
    },

    raiseEditModal: function(e) {
      console.log("rEM");
      e.stopPropagation();
      let listId = +$(e.target).closest("tr").attr("data-id");
      let todo   = todoManager.getTodoById(listId);
      app.editingId = listId;
      this.populateModal(todo);
      this.toggleModal();
    },

    bindEvents: function() {
      $("label[for='new_item']").on("click", this.toggleModal);
      $("#modal_layer").on("click", this.toggleModal.bind(this, true));
      $("#form_modal form").on("submit", app.sendForm.bind(app));
      $("#form_modal button").on("click", app.markComplete.bind(app));
      $("td.delete").on("click", app.removeTodo.bind(app));
      $("#items tr label").on("click", this.raiseEditModal.bind(this));
    },

    displayTodos: function(group="All Todos") {
      let displayGroup = todoManager.sendDisplay(group);
      $("body").html(this.$mainTemplate(displayGroup));
      $("td.list_item").on("click", app.toggleMarkComplete.bind(app));
      console.log(todoManager.todos);
      // the group param determines which group of todos were displaying and defaults to "all". This argument is passed to the todoMngr so it can determine what set to grab and send back to be displayed
    },

    refresh: function() {
    // will have acess to templates
      this.displayTodos();
      this.bindEvents();
    },

    init: function() { 
      // ui init could be pre compiling all templates? then it should be called within app.init
    }

  };

  /*///////////////////////////////////////////////////////////////////////////////////////
   T H I S   I S   T H E   APP  O B J E C T

  ///////////////////////////////////////////////////////////////////////////////////////*/

  let app = {
    editing: false,

    // could have a property set to the name of the todo group which list should be displayed. This property could changed based on the kind of requests the ui is making.
      // on 'Add new todo' for instance, we always display the All Todos group after completion. So when we call app.addTodo, app could set this property of its, to 'all_items'.

    // if app has a method that is called after api saves a new todo, than that method needs to set the global todos variable to the new data returned by getAll, and the tell todos obj to update its todos accordingly, then, probably, tell the ui to display the list

    removeTodo: function(e) {
      let todoId = $(e.target).closest("tr").attr("data-id");
      api.deleteATodo(todoId);
    },

    toggleMarkComplete: function(e) {
      console.log("tMC");
      let todoData;
      let listId = +$(e.target).closest("tr").attr("data-id");

      if ( todoManager.getTodoById(listId).completed ) {
        todoData = JSON.stringify({completed: false});
      } else {
        todoData = JSON.stringify({completed: true});
      }

      api.updateTodo(todoData, listId);
    },

    markComplete: function(e) {
      console.log("mC");
      e.preventDefault();
      api.updateTodo(JSON.stringify({completed: true}), this.editingId);
      this.editing = false;
    },

    getDataObject: function($form) {
      let values = $form[0];
      data = {
        title: values[1].value,
        day: values[2].value,
        month: values[3].value,
        year: values[4].value,
        description: values[5].value
      };

      Object.keys(data).forEach(function(k) {
        if(data[k] === "default") {
          data[k] = "";
        }
      });

      return data;
    },

    validateForm: function($form) {
      let title = $form.find("input#title").val();
      if(title.length >= 3) {
        return this.getDataObject($form);
      } else {
        return false;
      }
    },

    sendForm: function(e) {
      e.preventDefault();
      let $form = $(e.target);
      let result = this.validateForm($form);

      if(result) {
        let data = JSON.stringify(result);
        console.log(data);
        this.editing ? api.updateTodo(data, this.editingId) : api.saveNewTodo(data);
        ui.toggleModal(true);
      } else {
        alert("Todo must have title of at least 3 characters");
      }
    },

    retrievalSuccessResponse: function(todos) {
      todoManager.assignTodos(todos);
      ui.refresh("All Todos");
    },

    init: function() {
      api.retrieveAllTodos();
    }

  };


  /*///////////////////////////////////////////////////////////////////////////////////////
   T H I S   I S   T H E   API   O B J E C T

  ///////////////////////////////////////////////////////////////////////////////////////*/

  let api = {

    path: "api/todos/",

    deleteATodo: function(id) {
      $.ajax(this.path + id, {
        method: "DELETE",
        success: function(data, status, req) {
          api.retrieveAllTodos();
        }
      });
    },

    updateTodo: function(data, id) {
      $.ajax(this.path + id, {
        method: "PUT",
        data: data,
        contentType: "application/json",
        success: function(data, status, req) {
          // data will be the updated todo
          // need to refresh the list but it needs to be the list that the update was done in.
            // so perhaps an app method call, passing in the due date of the returned todo? That way the app can use that information to make a call to the ui, passing in the date/page indentifier
          api.retrieveAllTodos();
        }
      });
    },

    retrieveAllTodos: function() {
      $.ajax(this.path, {
        method: "GET",
        dataType: "json",
        success: function(data, status, req) {
          app.retrievalSuccessResponse(data);
        }
      });
    },

    saveNewTodo: function(todo) {
      $.ajax(this.path, {
        method: "POST",
        data: todo,
        contentType: "application/json",
        success: function(data, status, req) {
          api.retrieveAllTodos();
        },
        error: function(req, errmsg, obj) {
        }
      });
    },
  };

  app.init();
});
