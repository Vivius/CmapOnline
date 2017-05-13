/**
 * Created by Victor on 09/05/2017.
 */
import  Vue from 'vue/dist/vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);


var app = new Vue({
    el: '#app',
    data: {
        picked:'read',
        name: '',
        userID: '',
        seenBoxAccess: false,
        seenBlackOverlay: false,
        seenBoxNewGraph: false,
        seenBoxConfirm:false,
        styleObject: {
            'visibility': 'visible',
        },
        currentUser:[],
        graphs:[],
        read:[],
        write:[],
        graphID: 0,
    },
    created:function() {
        this.getCurrentUser();
        this.getAllGraphs();
    },
    methods: {
        insertGraph: function () {
            this.seenBoxNewGraph = false;
            this.seenBlackOverlay = false;
            this.$http.post('/graph/create', {name: this.name, read: [], write: [], owner: this.currentUser._id}).then(response => {
                this.getAllGraphs();
            }, response => {
            });
            this.name = '';
        },
        logout: function () {
            this.$http.post('/logout').then(response => {
                window.location.href = '/';
            }, response => {
            });
        },
        getAllGraphs: function () {
            this.$http.get('/graph/getAll').then(response => {
                this.graphs = response.body;
            }, response => {
            });
        },
        getAccess: function(id){
            this.$http.post('/graph/getAccess',{_id: id}).then(response => {
                this.read = response.body['read'];
                this.write = response.body['write'];
                this.graphID = id;
            }, response => {
            });
        },
        deleteGraph: function (id) {
            this.seenBoxConfirm = false;
            this.seenBlackOverlay = false;
            this.$http.post('/graph/deleteOne',{_id: id}).then(response => {
                this.getAllGraphs();
            }, response => {
            });
        },
        addAccess: function () {
            this.$http.post('/graph/addAccess',{graphID: this.graphID, userID: this.userID,access: this.picked}).then(response => {
                this.getAccess(this.graphID);
                this.userID = '';

            }, response => {
            });

        },
        changeAccess: function(userID,typeAccess){
            this.$http.post('/graph/changeAccess',{graphID: this.graphID, userID: userID, typeAccess: typeAccess}).then(response => {
            }, response => {
            });
        },
        deleteAccess: function (userID,typeAccess) {
            console.log(this.graphID);
            this.$http.post('/graph/deleteAccess',{graphID: this.graphID, userID: userID, typeAccess: typeAccess}).then(response => {
                this.getAccess(this.graphID);
            }, response => {
            });
        },
        canView: function(read){
            if(typeof read !== 'undefined') {
                for (var i = 0; i < read.length; i++) {
                    if (read[i]['id'] == this.currentUser._id)
                        return true;
                    else
                        return false;
                }
            }
            return false;
        },
        canEdit: function(write){
            if(typeof write !== 'undefined') {

                for (var i = 0; i < write.length; i++) {
                    if (write[i]['id'] == this.currentUser._id)
                        return true;
                    else
                        return false;
                }
            }
            return false;
        },
        isOwner: function(id){
            return id == this.currentUser._id;
        },
        getCurrentUser: function () {
            this.$http.get('/user/current').then(response => {
                this.currentUser = response.body;
            }, response => {
            });
        },
        redirectToEditor: function(event) {
            window.location.href = '/edit/'+event;
        },
        redirectToViewer: function(event) {
            window.location.href = '/view/'+event;
        }
    },
    filters: {
        convertDate: function (date) {
            if (!date) return ''
            var date = new Date(date);
            var monthNames = [
                "janvier", "février", "mars",
                "avril", "mai", "juin", "juillet",
                "août", "septembre", "octobre",
                "novembre", "décembre"
            ];

            var day = date.getDate();
            var monthIndex = date.getMonth();
            var year = date.getFullYear();

            return day + ' ' + monthNames[monthIndex] + ' ' + year;
        }
    }
})