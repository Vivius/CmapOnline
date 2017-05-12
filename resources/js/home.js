/**
 * Created by Victor on 09/05/2017.
 */
import  Vue from 'vue/dist/vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);


var app = new Vue({
    el: '#app',
    data: {
        owner:'',
        name: '',
        mail: '',
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
        this.getAllGraphs();
        this.getCurrentUser();
    },
    methods: {
        insertGraph: function () {
            this.seenBoxNewGraph = false;
            this.seenBlackOverlay = false;
            this.$http.post('/graph/create', {name: this.name, read: [{mail : 'ludoletroubadoure@gmail.com'}], write: [{mail:'vivus@troll.com'}], owner: 'victor.basset@yahoo.fr'}).then(response => {
                this.getAllGraphs();
            }, response => {
            });
            this.name = '';
        },
        getAllGraphs: function () {
            this.$http.get('/graph/getAll').then(response => {
                this.graphs = response.body;
            }, response => {
            });
        },
        getAccess: function(id){
            this.$http.post('/graph/getAccess',{_id: id}).then(response => {
                this.owner = response.body[0]['owner'];
                this.read = response.body[0]['read'];
                this.write = response.body[0]['write'];
                console.log(this.read);
                console.log(this.write);
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

        },
        getCurrentUser: function () {
            this.$http.get('/user/current').then(response => {
                this.currentUser = response.body;
                console.log(this.currentUser);
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