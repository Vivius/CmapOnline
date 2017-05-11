/**
 * Created by Victor on 09/05/2017.
 */
import  Vue from 'vue/dist/vue';
import VueResource from 'vue-resource';
Vue.use(VueResource);


var app = new Vue({
    el: '#app',
    data: {
        name: '',
        mail: '',
        seenBoxAccess: false,
        seenBlackOverlay: false,
        seenBoxNewGraph: false,
        seenBoxConfirm:false,
        styleObject: {
            'visibility': 'visible',
        },
        items:[],
        itemID: 0,
    },
    created:function() {
        this.getAllGraphs();
    },
    methods: {
        insertGraph: function (event) {
            this.seenBoxNewGraph = false;
            this.seenBlackOverlay = false;
            this.$http.post('/graph/create', {name: this.name }).then(response => {
                this.getAllGraphs();
            }, response => {
            });
            this.name = '';
        },
        getAllGraphs: function (event) {
            this.$http.get('/graph/getAll').then(response => {
                this.items = response.body;
                console.log(this.items);
            }, response => {
            });
        },
        deleteGraph: function (event) {
            this.seenBoxConfirm = false;
            this.seenBlackOverlay = false;
            this.$http.post('/graph/deleteOne',{_id: event}).then(response => {
                this.getAllGraphs();
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