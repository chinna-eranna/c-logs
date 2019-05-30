import { Component } from 'react';
import React from "react";
import * as actions from '../actions/applicationActions'
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import Button from 'react-bootstrap/Button';
import FormControl from 'react-bootstrap/FormControl'
import InputGroup from 'react-bootstrap/InputGroup'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'


export class Host extends Component {

    constructor(props){
        super(props);
        this.handleViewLogs = this.handleViewLogs.bind(this);
        this.handleIpChange = this.handleIpChange.bind(this);
    }

    handleViewLogs (){
        this.props.viewLogs(this.state.host);
    }

    handleIpChange(evt){
        this.setState({
            host: evt.target.value
        })
    }

    render (){
        let content = '';
        console.log("Props:  " + JSON.stringify(this.props));
        if(this.props.host){
            console.log("Host length :  " + this.props.host.length);
        }
        if (this.props.host && this.props.host.length > 0){
            content =  (
                <Container>
                <Row className="justify-content-md-center">
                    <Col xs lg="4">
                        <InputGroup className="mb-3">
                            <InputGroup.Text id="basic-addon1" >{this.props.host}</InputGroup.Text>
                            <InputGroup.Append>
                                <Button variant="outline-primary" onClick={this.handleViewLogs}>Change</Button>
                            </InputGroup.Append>
                        </InputGroup>
                    </Col>
                </Row>
            </Container>)
        }else{
            content  = (
                <Container>
                    <Row className="justify-content-md-center">
                        <Col xs lg="4">
                            <InputGroup>
                                <FormControl
                                placeholder="Host IP Address"
                                aria-label="Recipient's username" 
                                onChange={this.handleIpChange}/>
                                <InputGroup.Append>
                                    <Button variant="outline-primary" onClick={this.handleViewLogs}>View Logs</Button>
                                </InputGroup.Append>
                            </InputGroup>
                        </Col>
                    </Row>
                </Container>
            )
        }
        return (
            <div>
        {content}
        <hr/>
        
        </div>
        
        );
     }
}


const mapStateToProps = state => {
    console.log("mapstate: " +  JSON.stringify(state))
	return {
		host: state.application.host
	};
};

const mapDispatchToProps = dispatch => {
	return {
        viewLogs: (host)  => {dispatch(actions.monitorHost(host));}
        
	};
};

Host.propTypes = {
    viewLogs: PropTypes.func,
    host: PropTypes.string
}

export default connect(mapStateToProps,  mapDispatchToProps)(Host);