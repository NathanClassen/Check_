$(function() {

  (function() {
    $("[data-type='partial']").each(function(i) {
      let name = $(this).attr("id");
      let html = $(this).html();
      Handlebars.registerPartial(name, html);
    });
  })();

  const sortByStatus = (a, b) => {
    if (a.completed == b.completed) { return 0 };
    return a.completed && !b.completed ? 1 : -1;
  };

  let viewObject = {
    current_section: {},

    allTodosView: function() {
      this.selected = this.todos;
      this.current_section.title = "All Todos";
      this.current_section.data  = this.selected.length;
      return this;
    },

    todosByDateView: function(date) {
      this.selected = this.todos.filter(todo => todo.due_date === date);
      if ( ui.completedsView ) { this.selected = this.selected.filter(todo => todo.completed) };
      this.current_section.title = date;
      this.current_section.data  = this.selected.length;
      return this;
    },

    completedTodosView: function() {
      this.selected = this.done;
      this.current_section.title = "Completed";
      this.current_section.data  = this.selected.length;
      return this;
    },

    todosByDate: function(todos) {
      let dateLists = {};
      let todosByDate = [];
      todos.forEach(function(todo) {
        if (dateLists[todo.due_date]) {
          dateLists[todo.due_date].push(todo);
        } else {
          dateLists[todo.due_date] = [todo];
        }
      });

      Object.keys(dateLists).forEach(k => todosByDate.push({title: k, todos: dateLists[k]}));
      return todosByDate;
    },

    updateViewObject: function(allTodos) {
      this.todos = allTodos;
      this.done = allTodos.filter(todo => todo.completed);
      this.todos_by_date = this.todosByDate(this.todos);
      this.done_todos_by_date = this.todosByDate(this.done);
    }
  }

  let todoManager = {
    todos: null,

    organizeByStatus: function(todos) {
      return todos.sort(sortByStatus);
    },

    sendDisplay: function(group) {
      if ( group === "all_todos" ) {
        return viewObject.allTodosView.call(viewObject);
      } else if ( group === "completed_todos" ) {
        return viewObject.completedTodosView.call(viewObject);
      } else {
        return viewObject.todosByDateView(group);
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
      this.todos = this.organizeByStatus(todos);
      viewObject.updateViewObject.call(viewObject, this.todos);
    },

    getTodoById: function(id) {
      return this.todos.find(todo => todo.id === id);
    },
  };

  let ui = {
    $mainTemplate: Handlebars.compile($("#main_template").html()),
    completedsView: false,

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
      $("#all_todos").on("click", this.categoryRefresh.bind(this));
      $("#completed_todos").on("click", this.categoryRefresh.bind(this));
      $("article").on("click", this.singleGroupRefresh.bind(this));
    },

    displayTodos: function(group) {
      let displayGroup = todoManager.sendDisplay(group);
      $("body").html(this.$mainTemplate(displayGroup));
      $("td.list_item").on("click", app.toggleMarkComplete.bind(app));
    },

    categoryRefresh: function(e) {
      e.stopPropagation();
      let $div = $(e.target).closest("div");
      let group = $div.attr("id");
      this.refresh(group);
    },

    singleGroupRefresh: function(e) {
      let $el = $(e.target).closest("dl");
      let listName = $el.attr("data-title");
      console.log("list name: " + listName);
      this.completedsView = $el.attr("data-stat");
      this.refresh(listName);
    },

    refresh: function(group="all_todos") {
      this.currentDisplay = group;
      this.displayTodos(group.replace("done", ""));
      this.bindEvents();
      $(`[data-title='${group}']`).addClass("active");
    }
  };


  let app = {
    editing: false,

    removeTodo: function(e) {
      let todoId = $(e.target).closest("tr").attr("data-id");
      api.deleteATodo(todoId);
    },

    toggleMarkComplete: function(e) {
      let todoData;
      let listId = +$(e.target).closest("tr").attr("data-id");
      let todo   = todoManager.getTodoById(listId);
      todoData   = todo.completed ? { completed: false } : { completed: true };

      api.updateTodo(JSON.stringify(todoData), listId);
    },

    markComplete: function(e) {
      e.preventDefault();
      api.updateTodo(JSON.stringify({completed: true}), this.editingId);
      this.editing = false;
    },

    getDataObject: function($form) {
      let values = $form[0];
      data = {
        title: values[1].value,
        day:   values[2].value,
        month: values[3].value,
        year:  values[4].value,
        description: values[5].value
      };

      Object.keys(data).forEach(function(k) {
        if(data[k] === "default") { data[k] = "" };
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
        if( this.editing ) {
          api.updateTodo(data, this.editingId);
        } else {
          ui.currentDisplay = "all_todos";
          api.saveNewTodo(data);
        }
        ui.toggleModal(true);
      } else {
        alert("Todo must have title of at least 3 characters");
      }
    },

    retrievalSuccessResponse: function(todos) {
      todoManager.assignTodos(todos);
      ui.refresh(ui.currentDisplay);
    },

    init: function() {
      ui.currentDisplay = "all_todos";
      api.retrieveAllTodos();
    }
  };

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
